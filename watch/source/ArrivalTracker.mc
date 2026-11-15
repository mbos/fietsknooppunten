import Toybox.Lang;

//! Schakelt automatisch door naar het volgende knooppunt als je bij het huidige aankomt.
//!
//! - Aankomst: twee opeenvolgende GPS-fixes binnen ARRIVAL_RADIUS van het knooppunt.
//!   Bij de eerste echte rit lag het dichtstbijzijnde trackpunt 39 m van knooppunt 93,
//!   dus 25 m was te krap (ticket 07).
//! - Bij aankomst gaat de app meteen naar het volgende knooppunt: op de kruising wil je
//!   weten welk bordje je moet volgen.
//! - Er wordt alleen vooruit gekeken (het huidige en LOOKAHEAD volgende knooppunten), zodat
//!   een rondrit met 93 aan begin en eind geen probleem is. Kom je bij een later knooppunt
//!   aan (bv. omdat je er een gemist hebt), dan springt de app daarheen.
//! - Knoppen blijven werken; daarna gaat de detectie verder vanaf het gekozen knooppunt.
class ArrivalTracker {
    static const ARRIVAL_RADIUS = 50.0d;
    static const REQUIRED_FIXES = 2;
    static const LOOKAHEAD = 2;

    private var _nav as RouteNavigator;
    //! De stap waar de tracker vanuit gaat; wijkt die af van de navigator, dan is er een knop ingedrukt.
    private var _index as Number;
    //! Kandidaat-stap waarbinnen de laatste fixes lagen, en hoeveel achter elkaar.
    private var _hitIndex as Number = -1;
    private var _hits as Number = 0;
    //! Waar je het laatst aankwam. Een later knooppunt op dezelfde plek (bv. 93 in een
    //! kort heen-en-terugrondje) telt pas als je daar eerst weg bent geweest.
    private var _arrivalLat as Double? = null;
    private var _arrivalLon as Double? = null;

    function initialize(nav as RouteNavigator) {
        _nav = nav;
        _index = nav.index();
    }

    //! Na een nieuwe route: alles vergeten.
    function reset() as Void {
        _index = _nav.index();
        _hitIndex = -1;
        _hits = 0;
        _arrivalLat = null;
        _arrivalLon = null;
    }

    //! Verwerkt een GPS-fix. Geeft true terug bij aankomst bij een knooppunt (dan trillen).
    function update(lat as Double, lon as Double) as Boolean {
        if (_nav.index() != _index) {
            // Handmatig gekozen knooppunt: daar opnieuw beginnen. Waar je nu staat telt
            // als "net aangekomen", anders springt hij meteen weer door als je met UP
            // terugbladert naar het knooppunt waar je staat.
            _index = _nav.index();
            _hitIndex = -1;
            _hits = 0;
            _arrivalLat = lat;
            _arrivalLon = lon;
        }

        var lastArrival = _arrivalLat;
        var lastArrivalLon = _arrivalLon;
        if (lastArrival != null && lastArrivalLon != null
                && Geo.distance(lat, lon, lastArrival, lastArrivalLon) > 2 * ARRIVAL_RADIUS) {
            _arrivalLat = null;
            _arrivalLon = null;
        }

        var target = arrivedStep(lat, lon);
        if (target < 0) {
            _hitIndex = -1;
            _hits = 0;
            return false;
        }
        if (target == _hitIndex) {
            _hits++;
        } else {
            _hitIndex = target;
            _hits = 1;
        }
        if (_hits < REQUIRED_FIXES) {
            return false;
        }

        // Aangekomen bij stap `target`: door naar de stap erna (bij de laatste blijft hij staan).
        _nav.select(target);
        _nav.next();
        _index = _nav.index();
        _hitIndex = -1;
        _hits = 0;
        _arrivalLat = lat;
        _arrivalLon = lon;
        return true;
    }

    //! De eerste stap vanaf de huidige (tot LOOKAHEAD verder) waar je binnen de straal bent, of -1.
    private function arrivedStep(lat as Double, lon as Double) as Number {
        var last = _index + LOOKAHEAD;
        if (last > _nav.count() - 1) {
            last = _nav.count() - 1;
        }
        for (var i = _index; i <= last; i++) {
            var d = Geo.distanceToStep(lat, lon, _nav.stepAt(i));
            if (d != null && d <= ARRIVAL_RADIUS && !nearLastArrival(i)) {
                return i;
            }
        }
        return -1;
    }

    //! Ligt deze stap op de plek waar je net aankwam (en ben je daar nog niet weg geweest)?
    private function nearLastArrival(stepIndex as Number) as Boolean {
        var aLat = _arrivalLat;
        var aLon = _arrivalLon;
        if (aLat == null || aLon == null) {
            return false;
        }
        var d = Geo.distanceToStep(aLat, aLon, _nav.stepAt(stepIndex));
        return d != null && d <= 2 * ARRIVAL_RADIUS;
    }
}
