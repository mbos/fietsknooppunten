import Toybox.Lang;

//! Houdt bij naar welk knooppunt van de route je onderweg bent.
//! Een stap wordt herkend aan zijn plek in de route, niet aan zijn nummer
//! (in een rondrit staat hetzelfde knooppunt aan begin en eind).
class RouteNavigator {
    private var _route as Route;
    private var _index as Number = 0;

    function initialize(route as Route) {
        _route = route;
    }

    //! Een nieuwe route (van de webapp): weer bij het begin beginnen.
    function setRoute(route as Route) as Void {
        _route = route;
        _index = 0;
    }

    function route() as Route {
        return _route;
    }

    function index() as Number {
        return _index;
    }

    function count() as Number {
        return _route.steps.size();
    }

    function stepAt(index as Number) as RouteStep {
        return _route.steps[index];
    }

    //! Naar een bepaalde stap (bv. als de GPS ziet dat je er een overgeslagen hebt).
    function select(index as Number) as Void {
        if (index >= 0 && index < count()) {
            _index = index;
        }
    }

    function current() as RouteStep {
        return _route.steps[_index];
    }

    //! Het knooppunt na het huidige, of null bij het laatste.
    function upcoming() as RouteStep? {
        return isLast() ? null : _route.steps[_index + 1];
    }

    function isLast() as Boolean {
        return _index == count() - 1;
    }

    //! Naar het volgende knooppunt; false als je al bij het laatste bent.
    function next() as Boolean {
        if (isLast()) {
            return false;
        }
        _index++;
        return true;
    }

    //! Naar het vorige knooppunt; false als je al bij het eerste bent.
    function previous() as Boolean {
        if (_index == 0) {
            return false;
        }
        _index--;
        return true;
    }
}
