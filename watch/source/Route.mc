import Toybox.Lang;

//! Eén stap in de route: het knooppunt waar je naartoe fietst.
//! Coördinaten zijn graden x 100.000 (zie docs/route-format.md), of null als onbekend.
class RouteStep {
    var number as Number;
    var lat as Number?;
    var lon as Number?;

    function initialize(number as Number, lat as Number?, lon as Number?) {
        self.number = number;
        self.lat = lat;
        self.lon = lon;
    }
}

//! Een route in het formaat uit docs/route-format.md (versie 1).
class Route {
    static const FORMAT_VERSION = 1;

    var name as String;
    var steps as Array<RouteStep>;
    //! Vereenvoudigde track (graden x 100.000), of null bij een route zonder GPX-track (ticket 08).
    var trackLat as Array<Number>? = null;
    var trackLon as Array<Number>? = null;
    //! Afslagen: trackindex en richting (-2 scherp links, -1 links, 1 rechts, 2 scherp rechts).
    var turnIndex as Array<Number> = [] as Array<Number>;
    var turnDirection as Array<Number> = [] as Array<Number>;

    function initialize(name as String, steps as Array<RouteStep>) {
        self.name = name;
        self.steps = steps;
    }

    function hasTrack() as Boolean {
        return trackLat != null;
    }

    //! Zelfde naam en dezelfde stappen (nummer en locatie)?
    function sameAs(other as Route) as Boolean {
        if (!name.equals(other.name) || steps.size() != other.steps.size()) {
            return false;
        }
        for (var i = 0; i < steps.size(); i++) {
            var a = steps[i];
            var b = other.steps[i];
            if (a.number != b.number || a.lat != b.lat || a.lon != b.lon) {
                return false;
            }
        }
        return sameNumbers(trackLat, other.trackLat) && sameNumbers(trackLon, other.trackLon)
            && sameNumbers(turnIndex, other.turnIndex) && sameNumbers(turnDirection, other.turnDirection);
    }

    private static function sameNumbers(a as Array<Number>?, b as Array<Number>?) as Boolean {
        if (a == null || b == null) {
            return a == null && b == null;
        }
        if (a.size() != b.size()) {
            return false;
        }
        for (var i = 0; i < a.size(); i++) {
            if (a[i] != b[i]) {
                return false;
            }
        }
        return true;
    }

    //! Leest {"v":1,"n":"...","j":[[nr,lat,lon] of [nr], ...]}.
    //! Gooit een InvalidValueException bij een onbekend of kapot formaat.
    static function fromJson(data as Dictionary) as Route {
        if (data["v"] != FORMAT_VERSION) {
            throw new Lang.InvalidValueException("Onbekende routeversie");
        }
        var name = data["n"];
        var entries = data["j"];
        if (!(name instanceof String) || !(entries instanceof Array) || entries.size() == 0) {
            throw new Lang.InvalidValueException("Route zonder naam of stappen");
        }
        var steps = [] as Array<RouteStep>;
        for (var i = 0; i < entries.size(); i++) {
            var entry = entries[i];
            if (!(entry instanceof Array)) {
                throw new Lang.InvalidValueException("Ongeldige stap");
            }
            if (entry.size() == 1) {
                steps.add(new RouteStep(entry[0] as Number, null, null));
            } else if (entry.size() == 3) {
                steps.add(new RouteStep(entry[0] as Number, entry[1] as Number, entry[2] as Number));
            } else {
                throw new Lang.InvalidValueException("Ongeldige stap");
            }
        }
        var route = new Route(name, steps);
        readTrack(route, data["t"] as Object?, data["b"] as Object?);
        return route;
    }

    //! Optionele track `t` (eerste punt absoluut, daarna delta's) en afslagen `b`.
    private static function readTrack(route as Route, track as Object?, turns as Object?) as Void {
        if (track == null) {
            return;
        }
        if (!(track instanceof Array) || track.size() < 2) {
            throw new Lang.InvalidValueException("Ongeldige track");
        }
        var lats = [] as Array<Number>;
        var lons = [] as Array<Number>;
        var lat = 0;
        var lon = 0;
        for (var i = 0; i < track.size(); i++) {
            var point = track[i];
            if (!(point instanceof Array) || point.size() != 2
                    || !(point[0] instanceof Number) || !(point[1] instanceof Number)) {
                throw new Lang.InvalidValueException("Ongeldige track");
            }
            lat += point[0] as Number;
            lon += point[1] as Number;
            lats.add(lat);
            lons.add(lon);
        }
        route.trackLat = lats;
        route.trackLon = lons;
        if (turns == null) {
            return;
        }
        if (!(turns instanceof Array)) {
            throw new Lang.InvalidValueException("Ongeldige afslagen");
        }
        for (var i = 0; i < turns.size(); i++) {
            var turn = turns[i];
            if (!(turn instanceof Array) || turn.size() != 2
                    || !(turn[0] instanceof Number) || !(turn[1] instanceof Number)) {
                throw new Lang.InvalidValueException("Ongeldige afslagen");
            }
            var index = turn[0] as Number;
            var direction = turn[1] as Number;
            if (index < 1 || index > lats.size() - 2 || direction == 0 || direction < -2 || direction > 2) {
                throw new Lang.InvalidValueException("Ongeldige afslagen");
            }
            route.turnIndex.add(index);
            route.turnDirection.add(direction);
        }
    }
}
