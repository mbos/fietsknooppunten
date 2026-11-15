import Toybox.Application;
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;

//! Menu onder BACK en MENU: doorgaan, route ophalen, pauzeren/hervatten, opslaan of verwijderen.
module RideMenu {
    function show(recorder as RideRecorder) as Void {
        var menu = new WatchUi.Menu2({:title => text(Rez.Strings.RideMenuTitle)});
        menu.addItem(new WatchUi.MenuItem(text(Rez.Strings.Continue), null, :continue, null));
        menu.addItem(new WatchUi.MenuItem(text(Rez.Strings.FetchRoute), null, :fetch, null));
        if (recorder.isPaused()) {
            menu.addItem(new WatchUi.MenuItem(text(Rez.Strings.Resume), null, :resume, null));
        } else {
            menu.addItem(new WatchUi.MenuItem(text(Rez.Strings.Pause), null, :pause, null));
        }
        menu.addItem(new WatchUi.MenuItem(text(Rez.Strings.SaveAndStop), null, :save, null));
        menu.addItem(new WatchUi.MenuItem(text(Rez.Strings.Discard), null, :discard, null));
        WatchUi.pushView(menu, new RideMenuDelegate(recorder), WatchUi.SLIDE_UP);
    }

    function text(id as ResourceId) as String {
        return WatchUi.loadResource(id) as String;
    }
}

class RideMenuDelegate extends WatchUi.Menu2InputDelegate {
    private var _recorder as RideRecorder;

    function initialize(recorder as RideRecorder) {
        Menu2InputDelegate.initialize();
        _recorder = recorder;
    }

    function onSelect(item as WatchUi.MenuItem) as Void {
        var id = item.getId();
        if (id == :fetch) {
            (Application.getApp() as KnooppuntenApp).fetchRoute();
        } else if (id == :pause) {
            _recorder.pause();
        } else if (id == :resume) {
            _recorder.resume();
        } else if (id == :save) {
            _recorder.save();
            System.exit();
        } else if (id == :discard) {
            WatchUi.pushView(
                new WatchUi.Confirmation(RideMenu.text(Rez.Strings.ConfirmDiscard)),
                new DiscardDelegate(_recorder),
                WatchUi.SLIDE_IMMEDIATE
            );
            return;
        }
        WatchUi.popView(WatchUi.SLIDE_DOWN);
    }
}

//! "Rit verwijderen?" ja: weggooien en de app sluiten; nee: terug naar het menu.
class DiscardDelegate extends WatchUi.ConfirmationDelegate {
    private var _recorder as RideRecorder;

    function initialize(recorder as RideRecorder) {
        ConfirmationDelegate.initialize();
        _recorder = recorder;
    }

    function onResponse(response as WatchUi.Confirm) as Boolean {
        if (response == WatchUi.CONFIRM_YES) {
            _recorder.discard();
            System.exit();
        }
        return true;
    }
}
