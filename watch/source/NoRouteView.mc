import Toybox.Application;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Timer;
import Toybox.WatchUi;

//! Scherm als er nog nooit een route is ontvangen. De app haalt bij het starten
//! zelf een route op; via het menu (BACK) kan het opnieuw.
class NoRouteView extends WatchUi.View {
    private var _clock as Timer.Timer = new Timer.Timer();

    function initialize() {
        View.initialize();
    }

    //! Elke 5 s, zodat een melding ("geen verbinding") ook weer verdwijnt.
    function onShow() as Void {
        _clock.start(method(:tick), 5000, true);
    }

    function onHide() as Void {
        _clock.stop();
    }

    function tick() as Void {
        WatchUi.requestUpdate();
    }

    function onUpdate(dc as Dc) as Void {
        var w = dc.getWidth();
        var h = dc.getHeight();
        var center = Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER;
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, h * 0.42, Graphics.FONT_MEDIUM, WatchUi.loadResource(Rez.Strings.NoRoute) as String, center);
        dc.setColor(0x8C8C8C, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, h * 0.56, Graphics.FONT_XTINY, WatchUi.loadResource(Rez.Strings.NoRouteHint) as String, center);
        var notice = (Application.getApp() as KnooppuntenApp).notice();
        if (notice != null) {
            dc.setColor(0xFF5500, Graphics.COLOR_TRANSPARENT);
            dc.drawText(w / 2, h * 0.75, Graphics.FONT_XTINY, notice, center);
        }
    }
}

//! Zonder route doen alleen BACK en MENU iets: het ritmenu (route ophalen, stoppen).
class NoRouteDelegate extends WatchUi.BehaviorDelegate {
    private var _recorder as RideRecorder;

    function initialize(recorder as RideRecorder) {
        BehaviorDelegate.initialize();
        _recorder = recorder;
    }

    function onBack() as Boolean {
        RideMenu.show(_recorder);
        return true;
    }

    function onMenu() as Boolean {
        RideMenu.show(_recorder);
        return true;
    }

    function onSelect() as Boolean {
        RideMenu.show(_recorder);
        return true;
    }
}
