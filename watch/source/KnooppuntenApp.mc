import Toybox.Application;
import Toybox.Attention;
import Toybox.Lang;
import Toybox.Position;
import Toybox.System;
import Toybox.WatchUi;

class KnooppuntenApp extends Application.AppBase {
    private var _recorder as RideRecorder = new RideRecorder();
    private var _nav as RouteNavigator?;
    private var _tracker as ArrivalTracker?;
    private var _follower as TrackFollower?;
    //! Wanneer de laatste positiemelding binnenkwam (System.getTimer), zie pollPosition().
    private var _lastPositionAt as Number = 0;
    private var _view as RouteView?;
    private var _source as RouteSource;
    //! Korte melding onderaan het scherm (bv. "nieuwe route"), tot `_noticeUntil` (ms).
    private var _notice as String? = null;
    private var _noticeUntil as Number = 0;
    //! Alleen bij handmatig ophalen melden dat de route al actueel is.
    private var _manualFetch as Boolean = false;

    const NOTICE_MS = 8000;

    function initialize() {
        AppBase.initialize();
        _source = new RouteSource(method(:onRouteFetched));
    }

    function onStart(state as Dictionary?) as Void {
        var configuration = gnssConfiguration();
        System.println("gnss configuration=" + configuration);
        Position.enableLocationEvents({
            :acquisitionType => Position.LOCATION_CONTINUOUS,
            :configuration => configuration
        }, method(:onPosition));
        // De rit loopt vanaf het openen van de app; START is "volgend knooppunt".
        _recorder.start();
        // Kijken of er via de webapp een nieuwe route is verstuurd.
        _source.fetch();
    }

    //! Koppelcode gewijzigd in Garmin Connect: meteen proberen.
    function onSettingsChanged() as Void {
        fetchRoute();
    }

    //! Route ophalen op verzoek (menu); meldt het resultaat op het scherm.
    function fetchRoute() as Void {
        _manualFetch = true;
        showNotice(Rez.Strings.Fetching);
        _source.fetch();
    }

    function onRouteFetched(result as RouteSource.Result, route as Route?) as Void {
        var manual = _manualFetch;
        _manualFetch = false;
        if (route != null) {
            var nav = _nav;
            if (nav == null) {
                var views = routeViews(route);
                WatchUi.switchToView(views[0], views[1], WatchUi.SLIDE_IMMEDIATE);
            } else {
                nav.setRoute(route);
                (_tracker as ArrivalTracker).reset();
                // TrackFollower ziet zelf dat de route veranderd is.
            }
        }
        var message = noticeFor(result);
        if (message != null && (manual || result != RouteSource.UNCHANGED)) {
            showNotice(message);
        } else if (manual) {
            _notice = null;
        }
        WatchUi.requestUpdate();
    }

    private function noticeFor(result as RouteSource.Result) as ResourceId? {
        switch (result) {
            case RouteSource.RECEIVED: return Rez.Strings.RouteReceived;
            case RouteSource.UNCHANGED: return Rez.Strings.RouteUnchanged;
            case RouteSource.NOT_CONFIGURED: return Rez.Strings.NotConfigured;
            case RouteSource.NO_CONNECTION: return Rez.Strings.NoConnection;
            case RouteSource.WRONG_KEY: return Rez.Strings.WrongKey;
            case RouteSource.NOTHING_SENT: return Rez.Strings.NothingSent;
            case RouteSource.BUSY: return Rez.Strings.Busy;
            default: return Rez.Strings.FetchFailed;
        }
    }

    private function showNotice(id as ResourceId) as Void {
        _notice = WatchUi.loadResource(id) as String;
        _noticeUntil = System.getTimer() + NOTICE_MS;
    }

    //! De melding die nu getoond moet worden, of null.
    function notice() as String? {
        if (_notice != null && System.getTimer() > _noticeUntil) {
            _notice = null;
        }
        return _notice;
    }

    function onStop(state as Dictionary?) as Void {
        // Als de app onverwacht wordt afgesloten liever een rit bewaren dan kwijtraken.
        _recorder.save();
        Position.enableLocationEvents(Position.LOCATION_DISABLE, method(:onPosition));
    }

    //! Geen requestUpdate hier: dat zou het scherm elke seconde laten hertekenen.
    //! De view tekent alleen opnieuw als de afstand of de pijl zichtbaar verandert.
    function onPosition(info as Position.Info) as Void {
        _lastPositionAt = System.getTimer();
        var tracker = _tracker;
        var location = info.position;
        if (tracker != null && location != null && info.accuracy >= Position.QUALITY_USABLE) {
            var degrees = location.toDegrees() as Array<Double>;
            if (tracker.update(degrees[0], degrees[1])) {
                signalArrival();
                WatchUi.requestUpdate();
            }
            var follower = _follower;
            if (follower != null) {
                var event = follower.update(degrees[0], degrees[1], info.speed);
                if (event == TrackFollower.OFF_ROUTE) {
                    buzz([[100, 150], [0, 100], [100, 150], [0, 100], [100, 150]]);
                    wakeScreen();
                } else if (event == TrackFollower.TURN_SOON) {
                    buzz([[60, 200]]);
                }
            }
        }
        var view = _view;
        if (view != null) {
            view.refresh();
        }
    }

    //! Vanuit de schermtimer: als er een tijd geen positiemeldingen komen (de simulator
    //! stuurt ze niet bij stilstand), de track bijwerken met de positie die het systeem
    //! kent. Zonder snelheid, dus dit geeft nooit "van route" en schakelt niet door.
    function pollPosition() as Void {
        var follower = _follower;
        if (follower == null || System.getTimer() - _lastPositionAt < 4000) {
            return;
        }
        var info = Position.getInfo();
        var location = info.position;
        if (location != null && info.accuracy >= Position.QUALITY_USABLE) {
            var degrees = location.toDegrees() as Array<Double>;
            follower.update(degrees[0], degrees[1], null);
        }
    }

    //! Aangekomen bij een knooppunt: twee keer stevig trillen en het scherm even aan.
    //! (Van route: drie korte; afslag over 100 m: één korte.)
    private function signalArrival() as Void {
        buzz([[100, 300], [0, 150], [100, 300]]);
        wakeScreen();
    }

    //! Trilpatroon als lijst van [sterkte, duur in ms].
    private function buzz(pattern as Array<[Number, Number]>) as Void {
        if (Attention has :vibrate) {
            var profiles = [] as Array<Attention.VibeProfile>;
            for (var i = 0; i < pattern.size(); i++) {
                profiles.add(new Attention.VibeProfile(pattern[i][0], pattern[i][1]));
            }
            Attention.vibrate(profiles);
        }
    }

    private function wakeScreen() as Void {
        if (Attention has :backlight) {
            try {
                Attention.backlight(true);
            } catch (e) {
                // Te vaak of te lang aan (BacklightOnTooLongException): dan maar zonder.
            }
        }
    }

    //! Zuinigste SatIQ-stand met nog goede nauwkeurigheid; voor knooppunten herkennen
    //! binnen ~50 m is dat ruim genoeg. Zie docs/research/batterij.md.
    private function gnssConfiguration() as Position.Configuration {
        if (Position has :CONFIGURATION_SAT_IQ_EXTENDED_BATTERY
                && Position.hasConfigurationSupport(Position.CONFIGURATION_SAT_IQ_EXTENDED_BATTERY)) {
            return Position.CONFIGURATION_SAT_IQ_EXTENDED_BATTERY;
        }
        // Oudere toestellen (bv. Forerunner 255, fēnix 7) kennen SatIQ niet: dan bestaat het
        // symbool niet eens, dus eerst met `has` controleren.
        if (Position has :CONFIGURATION_SAT_IQ && Position.hasConfigurationSupport(Position.CONFIGURATION_SAT_IQ)) {
            return Position.CONFIGURATION_SAT_IQ;
        }
        return Position.CONFIGURATION_GPS;
    }

    function getInitialView() as [WatchUi.Views] or [WatchUi.Views, WatchUi.InputDelegates] {
        var route = RouteSource.stored();
        if (route == null) {
            route = fallbackRoute();
        }
        if (route == null) {
            return [new NoRouteView(), new NoRouteDelegate(_recorder)];
        }
        return routeViews(route);
    }

    private function routeViews(route as Route) as [RouteView, RouteDelegate] {
        var nav = new RouteNavigator(route);
        var follower = new TrackFollower(nav);
        var view = new RouteView(nav, _recorder, follower);
        _nav = nav;
        _tracker = new ArrivalTracker(nav);
        _follower = follower;
        _view = view;
        return [view, new RouteDelegate(nav, _recorder)];
    }

    //! In de simulator (debug-build) de testroute uit lokaal.gpx, zodat je zonder
    //! Worker kunt testen. In de store-versie (release) niet: daar komt de route van de webapp.
    (:debug)
    private function fallbackRoute() as Route? {
        return Route.fromJson(WatchUi.loadResource(Rez.JsonData.TestRoute) as Dictionary);
    }

    (:release)
    private function fallbackRoute() as Route? {
        return null;
    }
}
