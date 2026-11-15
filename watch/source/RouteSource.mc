import Toybox.Application;
import Toybox.Communications;
import Toybox.Lang;

//! Waar de route vandaan komt: de Cloudflare Worker (ticket 04), via de telefoon of Wi-Fi.
//! De laatst ontvangen route staat in Application.Storage, zodat hij ook zonder
//! verbinding beschikbaar is.
class RouteSource {
    static const STORAGE_KEY = "route";
    //! De Worker achter de webapp (worker/, https://fietsknooppunten.deboskes.eu).
    static const WORKER_URL = "https://fietsknooppunten.deboskes.eu/route";

    //! Uitkomst van een ophaalpoging, voor de melding op het scherm.
    enum Result {
        RECEIVED,
        UNCHANGED,
        NOT_CONFIGURED,
        NO_CONNECTION,
        WRONG_KEY,
        NOTHING_SENT,
        BUSY,
        FAILED
    }

    private var _onDone as Method(result as Result, route as Route?) as Void;
    private var _busy as Boolean = false;

    //! `onDone` krijgt de uitkomst en, bij RECEIVED, de nieuwe route.
    function initialize(onDone as Method(result as Result, route as Route?) as Void) {
        _onDone = onDone;
    }

    //! De laatst ontvangen route, of null als er nog nooit een is ontvangen.
    static function stored() as Route? {
        var data = Storage.getValue(STORAGE_KEY);
        if (!(data instanceof Dictionary)) {
            return null;
        }
        try {
            return Route.fromJson(data as Dictionary);
        } catch (e instanceof Lang.InvalidValueException) {
            return null;
        }
    }

    function isBusy() as Boolean {
        return _busy;
    }

    //! Vraagt de route op bij de Worker. Doet niets als er al een verzoek loopt.
    function fetch() as Void {
        if (_busy) {
            return;
        }
        var key = setting("code");
        if (key != null) {
            key = normalizeCode(key);
        }
        if (key == null || key.length() == 0) {
            _onDone.invoke(NOT_CONFIGURED, null);
            return;
        }
        _busy = true;
        Communications.makeWebRequest(WORKER_URL, null, {
            :method => Communications.HTTP_REQUEST_METHOD_GET,
            :headers => {"Authorization" => "Bearer " + key},
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        }, method(:onResponse));
    }

    function onResponse(code as Number, data as Dictionary or String or Null) as Void {
        _busy = false;
        var result = interpret(code, data);
        var route = null;
        if (result == RECEIVED) {
            var received = Route.fromJson(data as Dictionary);
            var current = stored();
            if (current != null && current.sameAs(received)) {
                result = UNCHANGED;
            } else {
                Storage.setValue(STORAGE_KEY, data as Dictionary<Storage.KeyType, Storage.ValueType>);
                route = received;
            }
        }
        _onDone.invoke(result, route);
    }

    //! Vertaalt een HTTP- of Connect IQ-foutcode naar een uitkomst. Bij RECEIVED is `data`
    //! een geldige route.
    static function interpret(code as Number, data as Dictionary or String or Null) as Result {
        if (code == 200) {
            if (!(data instanceof Dictionary)) {
                return FAILED;
            }
            try {
                Route.fromJson(data as Dictionary);
                return RECEIVED;
            } catch (e instanceof Lang.InvalidValueException) {
                return FAILED;
            }
        }
        if (code == 401) {
            return WRONG_KEY;
        }
        if (code == 404) {
            return NOTHING_SENT;
        }
        if (code == 429) {
            return BUSY;
        }
        if (code == Communications.BLE_CONNECTION_UNAVAILABLE
                || code == Communications.BLE_HOST_TIMEOUT
                || code == Communications.BLE_SERVER_TIMEOUT
                || code == Communications.NETWORK_REQUEST_TIMED_OUT) {
            return NO_CONNECTION;
        }
        return FAILED;
    }

    //! Een ingevulde instelling zonder spaties eromheen, of null.
    private function setting(key as String) as String? {
        var value = Properties.getValue(key);
        if (!(value instanceof String)) {
            return null;
        }
        var s = trim(value);
        return s.length() > 0 ? s : null;
    }

    //! Zoals de webapp en de Worker: hoofdletters, spaties en streepjes tellen niet mee.
    //! "K7M2-X9QP 4TVW-HC3D" -> "k7m2x9qp4tvwhc3d"
    static function normalizeCode(s as String) as String {
        var chars = s.toLower().toCharArray();
        var result = "";
        for (var i = 0; i < chars.size(); i++) {
            var c = chars[i];
            if (c != ' ' && c != '-' && c != '\t') {
                result += c.toString();
            }
        }
        return result;
    }

    static function trim(s as String) as String {
        var chars = s.toCharArray();
        var start = 0;
        var end = chars.size();
        while (start < end && chars[start] <= ' ') {
            start++;
        }
        while (end > start && chars[end - 1] <= ' ') {
            end--;
        }
        return s.substring(start, end) as String;
    }
}
