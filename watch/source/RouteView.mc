import Toybox.Activity;
import Toybox.Application;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Math;
import Toybox.Position;
import Toybox.Timer;
import Toybox.WatchUi;

//! Toont groot het knooppunt waar je naartoe fietst, klein het knooppunt daarna,
//! de voortgang als boog langs de rand van het ronde scherm,
//! een pijl aan de rand die wijst waar het knooppunt ligt (ten opzichte van je rijrichting),
//! en onderaan de afstand tot het knooppunt of de GPS-status.
//! Bij een route met track (ticket 08) staat onderaan de eerstvolgende afslag met de
//! afstand ernaartoe, en wijst de pijl terug naar de route als je ervan af bent.
class RouteView extends WatchUi.View {
    private const SIGN_GREEN = 0x00AA55;
    private const DIM = 0x8C8C8C;
    private const WARN = 0xFF5500;

    private var _nav as RouteNavigator;
    private var _recorder as RideRecorder;
    private var _follower as TrackFollower;

    // Wat er getekend wordt; zie compute().
    private var _status as String = "";
    private var _statusColor as Number = 0xFFFFFF;
    private var _statusSmall as Boolean = false;
    private var _towardsLine as String = "";
    //! Afslagsymbool onderaan (-2..2, 0 = rechtdoor), of null.
    private var _turn as Number? = null;
    //! Pijl aan de rand in graden t.o.v. de rijrichting, of null; oranje als je van route bent.
    private var _arrow as Number? = null;
    private var _arrowColor as Number = 0xFFFFFF;
    //! Schermgrootte ten opzichte van de fr970 (454 px), voor pijlen en lijndiktes.
    //! De ondersteunde horloges gaan van 218 tot 466 px; zie ticket publiek/07.
    private var _scale as Float = 1.0;
    private var _clock as Timer.Timer = new Timer.Timer();
    //! Pijl in stappen van zoveel graden; kleinere draaiingen tekenen we niet opnieuw.
    private const ARROW_STEP = 15;
    //! Onder deze snelheid (m/s) is de GPS-koers onbetrouwbaar.
    private const MIN_SPEED_FOR_COURSE = 1.5;

    //! Statusregel en pijlrichting zoals die het laatst getekend zijn; zie refresh().
    private var _drawnKey as String = "";
    private var _start as String;
    private var _last as String;
    private var _paused as String;
    private var _noGps as String;
    private var _noLocation as String;
    private var _offRoute as String;

    function initialize(nav as RouteNavigator, recorder as RideRecorder, follower as TrackFollower) {
        View.initialize();
        _nav = nav;
        _recorder = recorder;
        _follower = follower;
        _offRoute = WatchUi.loadResource(Rez.Strings.OffRoute) as String;
        _paused = WatchUi.loadResource(Rez.Strings.Paused) as String;
        _noGps = WatchUi.loadResource(Rez.Strings.NoGps) as String;
        _noLocation = WatchUi.loadResource(Rez.Strings.NoLocation) as String;
        _start = WatchUi.loadResource(Rez.Strings.Start) as String;
        _last = WatchUi.loadResource(Rez.Strings.Last) as String;
    }

    //! Na elke GPS-fix en elke 5 s (voor als er geen fixes komen, zoals in de simulator
    //! bij stilstand) kijken of de afstand of de pijl zichtbaar veranderd is. Meestal
    //! hoeft er niets getekend te worden (zuinig op AMOLED, zie docs/research/batterij.md).
    //! Knoppen vragen zelf een nieuwe tekening aan.
    function onShow() as Void {
        _drawnKey = "";
        _clock.start(method(:tick), 5000, true);
    }

    function onHide() as Void {
        _clock.stop();
    }

    function tick() as Void {
        (Application.getApp() as KnooppuntenApp).pollPosition();
        refresh();
    }

    function refresh() as Void {
        compute();
        if (!drawKey().equals(_drawnKey)) {
            WatchUi.requestUpdate();
        }
    }

    private function drawKey() as String {
        return _status + "|" + _towardsLine + "|" + _turn + "|" + _arrow + "|" + _arrowColor + "|" + _statusColor;
    }

    function onUpdate(dc as Dc) as Void {
        var w = dc.getWidth();
        var h = dc.getHeight();
        var cx = w / 2;
        var cy = h / 2;

        // Zwart scherm: leesbaar in de zon en zuinig op AMOLED.
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();

        _scale = w / 454.0;
        drawProgressArc(dc, cx, cy, w / 2 - px(6));

        compute();
        var arrow = _arrow;
        if (arrow != null) {
            drawArrow(dc, cx, cy, w / 2 - px(18), arrow, _arrowColor);
        }

        var center = Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER;

        dc.setColor(DIM, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.14, Graphics.FONT_SMALL,
            (_nav.index() + 1).toString() + "/" + _nav.count().toString(), center);
        dc.drawText(cx, h * 0.28, Graphics.FONT_SMALL, _towardsLine, center);

        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, cy + h * 0.02, Graphics.FONT_NUMBER_THAI_HOT, _nav.current().number.toString(), center);

        var upcoming = _nav.upcoming();
        dc.setColor(DIM, Graphics.COLOR_TRANSPARENT);
        if (upcoming != null) {
            dc.drawText(cx, h * 0.76, Graphics.FONT_MEDIUM, upcoming.number.toString(), center);
        } else {
            dc.drawText(cx, h * 0.76, Graphics.FONT_SMALL, _last, center);
        }

        drawStatus(dc, cx, (h * 0.87).toNumber());
        _drawnKey = drawKey();
    }

    //! Onderste regel: eventueel een afslagsymbool, met de tekst ernaast.
    private function drawStatus(dc as Dc, cx as Number, y as Number) as Void {
        var font = _statusSmall ? Graphics.FONT_XTINY : Graphics.FONT_SMALL;
        var vcenter = Graphics.TEXT_JUSTIFY_VCENTER;
        dc.setColor(_statusColor, Graphics.COLOR_TRANSPARENT);
        var turn = _turn;
        if (turn == null) {
            dc.drawText(cx, y, font, _status, Graphics.TEXT_JUSTIFY_CENTER | vcenter);
            return;
        }
        var icon = px(40);
        var gap = px(10);
        var width = icon + gap + dc.getTextWidthInPixels(_status, font);
        var left = cx - width / 2;
        drawTurn(dc, left + icon / 2, y, icon, turn);
        dc.setColor(_statusColor, Graphics.COLOR_TRANSPARENT);
        dc.drawText(left + icon + gap, y, font, _status, Graphics.TEXT_JUSTIFY_LEFT | vcenter);
    }

    //! Afslagpijl zoals bij wegnavigatie: een steel van onder naar het midden en dan
    //! rechtdoor (0), links/rechts (-1/1) of scherp terug (-2/2).
    private function drawTurn(dc as Dc, x as Number, y as Number, size as Number, direction as Number) as Void {
        var half = size / 2;
        var side = direction < 0 ? -1 : 1;
        var endX = x;
        var endY = y - half;
        if (direction == 1 || direction == -1) {
            endX = x + side * half;
            endY = y - half / 3;
        } else if (direction == 2 || direction == -2) {
            endX = x + side * half;
            endY = y + half / 2;
        }
        var bendY = direction == 0 ? y : y - half / 3;
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(px(6));
        dc.drawLine(x, y + half, x, bendY);
        dc.drawLine(x, bendY, endX, endY);
        // Pijlpunt in de richting van het laatste stuk.
        var dx = (endX - x).toFloat();
        var dy = (endY - bendY).toFloat();
        var length = Math.sqrt(dx * dx + dy * dy);
        if (length == 0) {
            return;
        }
        dx /= length;
        dy /= length;
        var head = px(11);
        var tipX = endX + dx * px(8);
        var tipY = endY + dy * px(8);
        var baseX = endX - dx * px(6);
        var baseY = endY - dy * px(6);
        dc.fillPolygon([
            [tipX, tipY],
            [baseX - dy * head, baseY + dx * head],
            [baseX + dy * head, baseY - dx * head]
        ]);
    }

    //! Huidige positie in graden als er een bruikbare fix is, anders null.
    private function position() as Array<Double>? {
        var info = Position.getInfo();
        var location = info.position;
        if (info.accuracy < Position.QUALITY_POOR || location == null) {
            return null;
        }
        return location.toDegrees() as Array<Double>;
    }

    //! Bepaalt wat er op het scherm komt; tekenen en refresh() gebruiken dit allebei.
    private function compute() as Void {
        _turn = null;
        _arrow = null;
        _arrowColor = Graphics.COLOR_WHITE;
        _statusColor = Graphics.COLOR_WHITE;
        _statusSmall = false;
        _towardsLine = _nav.index() == 0 ? _start : "";

        var here = position();
        if (_recorder.isPaused()) {
            warn(_paused);
        } else if (here == null) {
            warn(_noGps);
        } else {
            var d = Geo.distanceToStep(here[0], here[1], _nav.current());
            if (_follower.isOffRoute()) {
                // Van de route: oranje pijl terug naar het dichtstbijzijnde punt van de track.
                warn(_offRoute);
                _statusSmall = false;
                var p = _follower.nearestPoint();
                _arrow = relativeAngle(Geo.bearing(here[0], here[1], p[0], p[1]));
                _arrowColor = WARN;
            } else if (_follower.isGuiding()) {
                // Op de route: eerstvolgende afslag onderaan, knooppuntafstand bovenaan.
                var turn = _follower.nextTurn() as [Number, Float];
                var meters = turn[1] < 0 ? 0.0d : turn[1].toDouble();
                _turn = meters > 1000 ? 0 : turn[0];
                _status = Format.distance(meters);
                if (d != null && _nav.index() > 0) {
                    _towardsLine = Format.distance(d);
                }
            } else if (d == null) {
                warn(_noLocation);
            } else {
                _status = Format.distance(d);
                var bearing = Geo.bearingToStep(here[0], here[1], _nav.current());
                _arrow = bearing == null ? null : relativeAngle(bearing);
            }
        }

        var notice = (Application.getApp() as KnooppuntenApp).notice();
        if (notice != null) {
            _status = notice;
            _turn = null;
            _statusColor = SIGN_GREEN;
            _statusSmall = true;
        }
    }

    private function warn(text as String) as Void {
        _status = text;
        _statusColor = WARN;
        _statusSmall = true;
    }

    //! Richting ten opzichte van je rijrichting, in graden met de klok mee (0 = rechtdoor),
    //! afgerond op ARROW_STEP. Null als de rijrichting onbekend is.
    private function relativeAngle(bearing as Double) as Number? {
        var heading = heading();
        if (heading == null) {
            return null;
        }
        var relative = Geo.normalize(bearing - heading).toNumber();
        return ((relative + ARROW_STEP / 2) / ARROW_STEP * ARROW_STEP) % 360;
    }

    //! Rijrichting in graden: tijdens het rijden de GPS-koers, bij stilstand het kompas
    //! (`currentHeading`, waar de bovenkant van het horloge naar wijst). Null als geen van
    //! beide er is.
    private function heading() as Double? {
        var info = Position.getInfo();
        var speed = info.speed;
        var radians = speed != null && speed >= MIN_SPEED_FOR_COURSE ? info.heading : null;
        if (radians == null) {
            var activity = Activity.getActivityInfo();
            radians = activity != null ? activity.currentHeading : null;
        }
        return radians == null ? null : Math.toDegrees(radians.toDouble()).toDouble();
    }

    //! Driehoek aan de rand van het scherm die naar het knooppunt wijst; boven = rechtdoor.
    private function drawArrow(dc as Dc, cx as Number, cy as Number, r as Number, degrees as Number, color as Number) as Void {
        var a = Math.toRadians(degrees);
        var sin = Math.sin(a);
        var cos = Math.cos(a);
        var length = px(40);
        var halfWidth = px(22);
        var tipX = cx + r * sin;
        var tipY = cy - r * cos;
        var baseX = cx + (r - length) * sin;
        var baseY = cy - (r - length) * cos;
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.fillPolygon([
            [tipX, tipY],
            [baseX + halfWidth * cos, baseY + halfWidth * sin],
            [baseX - halfWidth * cos, baseY - halfWidth * sin]
        ]);
    }

    //! Een maat in pixels op de fr970, omgerekend naar dit scherm (minimaal 1).
    private function px(pixels as Number) as Number {
        var scaled = (pixels * _scale + 0.5).toNumber();
        return scaled < 1 ? 1 : scaled;
    }

    //! Groene boog met de klok mee vanaf 12 uur; vol bij het laatste knooppunt.
    //! Geen achtergrondring: op AMOLED kost elk brandend pixel stroom.
    private function drawProgressArc(dc as Dc, cx as Number, cy as Number, r as Number) as Void {
        dc.setPenWidth(px(8));
        if (_nav.count() < 2 || _nav.index() == 0) {
            return;
        }
        dc.setColor(SIGN_GREEN, Graphics.COLOR_TRANSPARENT);
        if (_nav.isLast()) {
            dc.drawCircle(cx, cy, r);
            return;
        }
        var sweep = 360 * _nav.index() / (_nav.count() - 1);
        dc.drawArc(cx, cy, r, Graphics.ARC_CLOCKWISE, 90, 90 - sweep);
    }
}
