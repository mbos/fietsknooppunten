import Toybox.Lang;
import Toybox.Test;

// Testtrack: 300 m noord, rechtsaf 300 m oost, linksaf 300 m noord (eenheden van 1e-5 graad).
// 300 m oost bij 51,7° is 436 eenheden lengte.
function hookRoute() as RouteNavigator {
    return new RouteNavigator(Route.fromJson({
        "v" => 1, "n" => "haak",
        "j" => [[1, 5170000, 536000], [2, 5170540, 536436]],
        "t" => [[5170000, 536000], [270, 0], [0, 436], [270, 0]],
        "b" => [[1, 1], [2, -1]]
    }));
}

//! Positie `north` en `east` meter van het begin van de testtrack.
function at(north as Number, east as Number) as [Double, Double] {
    return [(5170000 + north / 1.1119492664d) / 100000.0d,
            (536000 + east / (1.1119492664d * 0.6196d)) / 100000.0d];
}

function feed(follower as TrackFollower, p as [Double, Double], speed as Float) as TrackFollower.Event {
    return follower.update(p[0], p[1], speed);
}

(:test)
function routeReadsDeltaTrackAndTurns(logger as Logger) as Boolean {
    var route = hookRoute().route();
    Test.assert(route.hasTrack());
    var lats = route.trackLat as Array<Number>;
    var lons = route.trackLon as Array<Number>;
    Test.assertEqual(lats[3], 5170540);
    Test.assertEqual(lons[3], 536436);
    Test.assertEqual(route.turnIndex[1], 2);
    Test.assertEqual(route.turnDirection[1], -1);
    return true;
}

(:test)
function routeRejectsTurnOutsideTrack(logger as Logger) as Boolean {
    try {
        Route.fromJson({"v" => 1, "n" => "x", "j" => [[1]], "t" => [[1, 2], [3, 4]], "b" => [[1, 1]]});
    } catch (e instanceof Lang.InvalidValueException) {
        return true;
    }
    return false;
}

(:test)
function followerShowsNextTurnWithDistanceAlongTrack(logger as Logger) as Boolean {
    var nav = hookRoute();
    nav.next();
    var follower = new TrackFollower(nav);
    feed(follower, at(100, 5), 5.0);
    Test.assert(follower.isGuiding());
    var turn = follower.nextTurn() as [Number, Float];
    logger.debug("volgende afslag: " + turn);
    Test.assertEqual(turn[0], 1);
    Test.assert(near(turn[1].toDouble(), 200.0d, 3.0d));

    // Halverwege het stuk naar het oosten: de volgende is linksaf, nog ~150 m.
    feed(follower, at(300, 150), 5.0);
    turn = follower.nextTurn() as [Number, Float];
    Test.assertEqual(turn[0], -1);
    Test.assert(near(turn[1].toDouble(), 150.0d, 3.0d));

    // Voorbij de laatste afslag: geen afslag meer, afstand tot het einde.
    feed(follower, at(400, 300), 5.0);
    turn = follower.nextTurn() as [Number, Float];
    Test.assertEqual(turn[0], 0);
    Test.assert(near(turn[1].toDouble(), 200.0d, 3.0d));
    return true;
}

(:test)
function followerBuzzesOnceBeforeATurn(logger as Logger) as Boolean {
    var nav = hookRoute();
    nav.next();
    var follower = new TrackFollower(nav);
    Test.assertEqual(feed(follower, at(100, 0), 5.0), TrackFollower.NONE);
    Test.assertEqual(feed(follower, at(220, 0), 5.0), TrackFollower.TURN_SOON);
    Test.assertEqual(feed(follower, at(250, 0), 5.0), TrackFollower.NONE);
    return true;
}

(:test)
function followerWarnsWhenOffRouteAndRecovers(logger as Logger) as Boolean {
    var nav = hookRoute();
    nav.next();
    var follower = new TrackFollower(nav);
    feed(follower, at(100, 0), 5.0);
    for (var i = 0; i < 4; i++) {
        Test.assertEqual(feed(follower, at(150, -100), 5.0), TrackFollower.NONE);
    }
    Test.assert(!follower.isOffRoute());
    Test.assertEqual(feed(follower, at(150, -100), 5.0), TrackFollower.OFF_ROUTE);
    Test.assert(follower.isOffRoute());
    Test.assert(!follower.isGuiding());
    var p = follower.nearestPoint();
    Test.assert(near(p[1], 5.36d, 0.00002d));   // terug naar de track (lengte 5,36000)

    Test.assertEqual(feed(follower, at(160, -40), 5.0), TrackFollower.NONE);
    Test.assertEqual(feed(follower, at(170, -5), 5.0), TrackFollower.BACK_ON_ROUTE);
    Test.assert(follower.isGuiding());
    return true;
}

(:test)
function followerDoesNotWarnBeforeStartOrWhenStopped(logger as Logger) as Boolean {
    var nav = hookRoute();
    var follower = new TrackFollower(nav);
    feed(follower, at(100, 0), 5.0);
    for (var i = 0; i < 8; i++) {
        Test.assertEqual(feed(follower, at(150, -100), 5.0), TrackFollower.NONE);   // stap 1: nog op weg naar de start
    }
    nav.next();
    feed(follower, at(100, 0), 5.0);
    for (var i = 0; i < 8; i++) {
        Test.assertEqual(feed(follower, at(150, -100), 0.5), TrackFollower.NONE);   // stilstaan of lopen
    }
    Test.assert(!follower.isOffRoute());
    return true;
}

(:test)
function followerIgnoresRoutesWithoutTrack(logger as Logger) as Boolean {
    var nav = loop();
    nav.next();
    var follower = new TrackFollower(nav);
    Test.assertEqual(follower.update(51.72d, 5.36d, 5.0), TrackFollower.NONE);
    Test.assert(!follower.isGuiding());
    Test.assert(!follower.isOffRoute());
    Test.assert(follower.nextTurn() == null);
    return true;
}

(:test)
function followerStartsOverWithNewRoute(logger as Logger) as Boolean {
    var nav = hookRoute();
    nav.next();
    var follower = new TrackFollower(nav);
    feed(follower, at(100, 0), 5.0);
    Test.assert(follower.isGuiding());
    nav.setRoute(Route.fromJson({"v" => 1, "n" => "x", "j" => [[5]]}));
    feed(follower, at(100, 0), 5.0);
    Test.assert(!follower.isGuiding());
    return true;
}
