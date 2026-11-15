import Toybox.Attention;
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;

//! Knoppen tijdens het fietsen:
//! DOWN en START/ENTER ("ja") = volgend knooppunt, UP = vorig knooppunt,
//! BACK en MENU (UP lang indrukken) = ritmenu (pauzeren, opslaan, verwijderen).
//! Het touchscreen doet niets,
//! zodat een tik of veeg met een handschoen het knooppunt niet verandert.
class RouteDelegate extends WatchUi.BehaviorDelegate {
    private var _nav as RouteNavigator;
    private var _recorder as RideRecorder;

    function initialize(nav as RouteNavigator, recorder as RideRecorder) {
        BehaviorDelegate.initialize();
        _nav = nav;
        _recorder = recorder;
    }

    function onNextPage() as Boolean {
        return advance();
    }

    function onSelect() as Boolean {
        return advance();
    }

    function onPreviousPage() as Boolean {
        if (_nav.previous()) {
            WatchUi.requestUpdate();
        } else {
            buzz();
        }
        return true;
    }

    function onBack() as Boolean {
        RideMenu.show(_recorder);
        return true;
    }

    function onMenu() as Boolean {
        RideMenu.show(_recorder);
        return true;
    }

    //! Alleen loggen, zodat we de echte knopcodes van de fr970 kunnen vastleggen.
    //! false: de knop gaat daarna door naar de behaviors hierboven.
    function onKey(keyEvent as WatchUi.KeyEvent) as Boolean {
        System.println("key=" + keyEvent.getKey() + " type=" + keyEvent.getType());
        return false;
    }

    // Touch volledig opslokken.
    function onTap(clickEvent as WatchUi.ClickEvent) as Boolean {
        return true;
    }

    function onSwipe(swipeEvent as WatchUi.SwipeEvent) as Boolean {
        return true;
    }

    function onHold(clickEvent as WatchUi.ClickEvent) as Boolean {
        return true;
    }

    function onRelease(clickEvent as WatchUi.ClickEvent) as Boolean {
        return true;
    }

    function onFlick(flickEvent as WatchUi.FlickEvent) as Boolean {
        return true;
    }

    function onDrag(dragEvent as WatchUi.DragEvent) as Boolean {
        return true;
    }

    private function advance() as Boolean {
        if (_nav.next()) {
            WatchUi.requestUpdate();
        } else {
            buzz();
        }
        return true;
    }

    //! Korte tik als je voorbij het begin of eind van de route wilt.
    private function buzz() as Void {
        if (Attention has :vibrate) {
            Attention.vibrate([new Attention.VibeProfile(50, 80)]);
        }
    }
}
