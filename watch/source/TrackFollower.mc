import Toybox.Lang;
import Toybox.Math;

//! Volgt je positie langs de vereenvoudigde track van een GPX-route (ticket 08):
//! - de eerstvolgende afslag en de afstand ernaartoe langs de track;
//! - "van route" als je de track verlaat.
//! Routes zonder track: doet niets.
//!
//! Je positie wordt op de track geprojecteerd binnen een venster rond de vorige
//! projectie, zodat hij bij lussen of een kruisend eigen spoor niet terugspringt.
//! Zolang je (nog) niet op de track zit, of van de route bent, wordt de hele track doorzocht.
class TrackFollower {
    enum Event {
        NONE,
        OFF_ROUTE,
        BACK_ON_ROUTE,
        TURN_SOON
    }

    //! Binnen deze afstand zit je op de route.
    static const ON_ROUTE_DISTANCE = 30.0;
    //! Verder dan dit, bij OFF_ROUTE_FIXES fixes achter elkaar en rijdend: van route.
    static const OFF_ROUTE_DISTANCE = 50.0;
    static const OFF_ROUTE_FIXES = 5;
    static const MIN_SPEED = 2.0;
    //! Kort trillen zo ver voor een afslag.
    static const ANNOUNCE_DISTANCE = 100.0;
    static const WINDOW_BACK = 5;
    static const WINDOW_AHEAD = 40;
    //! Meter per 1e-5 graad breedte (R * pi / 180 / 100.000).
    static const METERS_PER_UNIT = 1.1119492664d;

    private var _nav as RouteNavigator;
    private var _route as Route? = null;
    //! Afstand langs de track vanaf het begin tot elk trackpunt, in meters.
    private var _along as Array<Float> = [] as Array<Float>;

    private var _locked as Boolean = false;
    private var _offRoute as Boolean = false;
    private var _offFixes as Number = 0;
    //! Projectie: segment (van punt i naar i+1) en de fractie daarlangs.
    private var _segment as Number = 0;
    private var _fraction as Float = 0.0;
    //! Afslag (index in de afslagenlijst) waarvoor al getrild is.
    private var _announced as Number = -1;
    //! Dichtstbijzijnde punt op de track bij de laatste fix, in graden.
    private var _nearestLat as Double = 0.0d;
    private var _nearestLon as Double = 0.0d;

    // Uitkomst van search().
    private var _bestDistance as Float = 0.0;
    private var _bestSegment as Number = 0;
    private var _bestFraction as Float = 0.0;

    function initialize(nav as RouteNavigator) {
        _nav = nav;
    }

    //! Verwerkt een GPS-fix. `speed` in m/s (of null).
    function update(lat as Double, lon as Double, speed as Float?) as Event {
        var route = syncRoute();
        if (route == null) {
            return NONE;
        }
        var count = (route.trackLat as Array<Number>).size();
        if (_locked) {
            var from = _segment - WINDOW_BACK;
            var to = _segment + WINDOW_AHEAD;
            search(lat, lon, from < 0 ? 0 : from, to > count - 2 ? count - 2 : to);
        } else {
            search(lat, lon, 0, count - 2);
        }
        var d = _bestDistance;

        if (d <= ON_ROUTE_DISTANCE || (_locked && d <= OFF_ROUTE_DISTANCE)) {
            var wasOff = _offRoute;
            _locked = true;
            _offRoute = false;
            _offFixes = 0;
            _segment = _bestSegment;
            _fraction = _bestFraction;
            if (wasOff) {
                return BACK_ON_ROUTE;
            }
            return announce();
        }

        // Verder dan de tolerantie. Alleen na de start, rijdend en een paar fixes lang.
        if (_locked && _nav.index() > 0 && speed != null && speed >= MIN_SPEED) {
            _offFixes++;
            if (_offFixes >= OFF_ROUTE_FIXES) {
                _offRoute = true;
                _locked = false;
                _offFixes = 0;
                return OFF_ROUTE;
            }
        }
        return NONE;
    }

    //! Op de route, na de start: dan tonen we afslagen.
    function isGuiding() as Boolean {
        return _route != null && _locked && !_offRoute && _nav.index() > 0;
    }

    function isOffRoute() as Boolean {
        return _route != null && _offRoute;
    }

    //! Het dichtstbijzijnde punt op de track bij de laatste fix (voor de pijl als je van route bent).
    function nearestPoint() as [Double, Double] {
        return [_nearestLat, _nearestLon];
    }

    //! [richting, meters] van de eerstvolgende afslag; richting 0 = geen afslag meer
    //! (meters is dan de afstand tot het einde van de track). Null zonder track.
    function nextTurn() as [Number, Float]? {
        var route = _route;
        if (route == null) {
            return null;
        }
        var k = nextTurnIndex(route);
        var here = position();
        if (k < 0) {
            return [0, _along[_along.size() - 1] - here];
        }
        return [route.turnDirection[k], _along[route.turnIndex[k]] - here];
    }

    // MARK: intern

    //! Kort trillen bij de eerste fix binnen ANNOUNCE_DISTANCE van een afslag.
    private function announce() as Event {
        var route = _route as Route;
        if (_nav.index() == 0) {
            return NONE;
        }
        var k = nextTurnIndex(route);
        if (k < 0 || k == _announced) {
            return NONE;
        }
        if (_along[route.turnIndex[k]] - position() <= ANNOUNCE_DISTANCE) {
            _announced = k;
            return TURN_SOON;
        }
        return NONE;
    }

    //! Index in de afslagenlijst van de eerste afslag voorbij de huidige projectie, of -1.
    private function nextTurnIndex(route as Route) as Number {
        for (var k = 0; k < route.turnIndex.size(); k++) {
            if (route.turnIndex[k] > _segment) {
                return k;
            }
        }
        return -1;
    }

    //! Afstand langs de track tot de huidige projectie.
    private function position() as Float {
        var length = _along[_segment + 1] - _along[_segment];
        return _along[_segment] + _fraction * length;
    }

    //! Nieuwe route in de navigator? Dan opnieuw beginnen.
    private function syncRoute() as Route? {
        var route = _nav.route();
        if (route != _route) {
            _route = null;
            _locked = false;
            _offRoute = false;
            _offFixes = 0;
            _segment = 0;
            _fraction = 0.0;
            _announced = -1;
            if (route.hasTrack()) {
                _route = route;
                _along = cumulative(route.trackLat as Array<Number>, route.trackLon as Array<Number>);
            }
        }
        return _route;
    }

    private static function cumulative(lats as Array<Number>, lons as Array<Number>) as Array<Float> {
        var along = [0.0] as Array<Float>;
        var total = 0.0;
        for (var i = 1; i < lats.size(); i++) {
            var c = Math.cos(Math.toRadians(lats[i] / 100000.0d));
            var dy = (lats[i] - lats[i - 1]).toFloat();
            var dx = ((lons[i] - lons[i - 1]) * c).toFloat();
            total += (Math.sqrt(dx * dx + dy * dy) * METERS_PER_UNIT).toFloat();
            along.add(total);
        }
        return along;
    }

    //! Dichtstbijzijnde punt op de segmenten from..to. Rekent in een plat vlak rond de
    //! positie, in eenheden van 1e-5 graad (lengte gecorrigeerd met cos(breedte)).
    private function search(lat as Double, lon as Double, from as Number, to as Number) as Void {
        var route = _route as Route;
        var lats = route.trackLat as Array<Number>;
        var lons = route.trackLon as Array<Number>;
        var pLat = lat * 100000.0d;
        var pLon = lon * 100000.0d;
        var c = Math.cos(Math.toRadians(lat));
        var best = -1.0;
        for (var i = from; i <= to; i++) {
            var ax = ((lons[i] - pLon) * c).toFloat();
            var ay = (lats[i] - pLat).toFloat();
            var bx = ((lons[i + 1] - pLon) * c).toFloat();
            var by = (lats[i + 1] - pLat).toFloat();
            var dx = bx - ax;
            var dy = by - ay;
            var lengthSquared = dx * dx + dy * dy;
            var t = lengthSquared > 0 ? -(ax * dx + ay * dy) / lengthSquared : 0.0;
            if (t < 0) {
                t = 0.0;
            } else if (t > 1) {
                t = 1.0;
            }
            var cx = ax + t * dx;
            var cy = ay + t * dy;
            var squared = cx * cx + cy * cy;
            if (best < 0 || squared < best) {
                best = squared;
                _bestSegment = i;
                _bestFraction = t;
                _nearestLat = (pLat + cy) / 100000.0d;
                _nearestLon = (pLon + cx / c) / 100000.0d;
            }
        }
        _bestDistance = (Math.sqrt(best) * METERS_PER_UNIT).toFloat();
    }
}
