import Toybox.Activity;
import Toybox.ActivityRecording;
import Toybox.Lang;

//! Neemt de rit op als fietsactiviteit, zodat hij na afloop in Garmin Connect staat.
class RideRecorder {
    private var _session as ActivityRecording.Session?;

    //! Start een nieuwe fietsrit. Doet niets als er al een loopt.
    function start() as Void {
        if (_session != null) {
            return;
        }
        var session = ActivityRecording.createSession({
            :name => "Knooppunten",
            :sport => Activity.SPORT_CYCLING,
            :subSport => Activity.SUB_SPORT_GENERIC
        });
        session.start();
        _session = session;
    }

    function hasSession() as Boolean {
        return _session != null;
    }

    function isRecording() as Boolean {
        var session = _session;
        return session != null && session.isRecording();
    }

    function isPaused() as Boolean {
        return hasSession() && !isRecording();
    }

    function pause() as Void {
        var session = _session;
        if (session != null && session.isRecording()) {
            session.stop();
        }
    }

    function resume() as Void {
        var session = _session;
        if (session != null && !session.isRecording()) {
            session.start();
        }
    }

    //! Stopt en bewaart de rit; hij wordt bij de volgende sync naar Garmin Connect gestuurd.
    function save() as Void {
        var session = _session;
        if (session != null) {
            if (session.isRecording()) {
                session.stop();
            }
            session.save();
            _session = null;
        }
    }

    //! Stopt en gooit de rit weg.
    function discard() as Void {
        var session = _session;
        if (session != null) {
            if (session.isRecording()) {
                session.stop();
            }
            session.discard();
            _session = null;
        }
    }
}
