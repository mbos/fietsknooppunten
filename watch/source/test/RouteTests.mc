import Toybox.Lang;
import Toybox.Test;

(:test)
function routeParsesStepsWithAndWithoutCoordinates(logger as Logger) as Boolean {
    var route = Route.fromJson({"v" => 1, "n" => "lokaal", "j" => [[93, 5171976, 536379], [5]]});
    Test.assertEqual(route.name, "lokaal");
    Test.assertEqual(route.steps.size(), 2);
    Test.assertEqual(route.steps[0].number, 93);
    Test.assertEqual(route.steps[0].lat as Number, 5171976);
    Test.assertEqual(route.steps[0].lon as Number, 536379);
    Test.assertEqual(route.steps[1].number, 5);
    Test.assert(route.steps[1].lat == null);
    return true;
}

(:test)
function routeRejectsUnknownVersion(logger as Logger) as Boolean {
    try {
        Route.fromJson({"v" => 2, "n" => "x", "j" => [[1]]});
    } catch (e instanceof Lang.InvalidValueException) {
        return true;
    }
    return false;
}

(:test)
function routeRejectsMalformedStep(logger as Logger) as Boolean {
    try {
        Route.fromJson({"v" => 1, "n" => "x", "j" => [[1, 2]]});
    } catch (e instanceof Lang.InvalidValueException) {
        return true;
    }
    return false;
}

(:test)
function routeRejectsEmptyRoute(logger as Logger) as Boolean {
    try {
        Route.fromJson({"v" => 1, "n" => "x", "j" => []});
    } catch (e instanceof Lang.InvalidValueException) {
        return true;
    }
    return false;
}

function roundTrip() as RouteNavigator {
    return new RouteNavigator(Route.fromJson({"v" => 1, "n" => "rondje", "j" => [[93], [99], [94], [93]]}));
}

(:test)
function navigatorStartsAtFirstStep(logger as Logger) as Boolean {
    var nav = roundTrip();
    Test.assertEqual(nav.index(), 0);
    Test.assertEqual(nav.current().number, 93);
    Test.assertEqual((nav.upcoming() as RouteStep).number, 99);
    return true;
}

(:test)
function navigatorStopsAtEnds(logger as Logger) as Boolean {
    var nav = roundTrip();
    Test.assert(!nav.previous());
    Test.assertEqual(nav.index(), 0);
    Test.assert(nav.next());
    Test.assert(nav.next());
    Test.assert(nav.next());
    Test.assert(nav.isLast());
    Test.assert(nav.upcoming() == null);
    Test.assert(!nav.next());
    Test.assertEqual(nav.index(), 3);
    return true;
}

(:test)
function navigatorTreatsRepeatedJunctionAsSeparateStep(logger as Logger) as Boolean {
    var nav = roundTrip();
    nav.next();
    nav.next();
    nav.next();
    Test.assertEqual(nav.current().number, 93);
    Test.assertEqual(nav.index(), 3);
    Test.assert(nav.previous());
    Test.assertEqual(nav.current().number, 94);
    return true;
}


(:test)
function routeSourceTrimsSettings(logger as Logger) as Boolean {
    Test.assertEqual(RouteSource.trim("  abc \n"), "abc");
    Test.assertEqual(RouteSource.trim("   "), "");
    Test.assertEqual(RouteSource.normalizeCode("K7M2-X9QP 4TVW-HC3D"), "k7m2x9qp4tvwhc3d");
    Test.assertEqual(RouteSource.normalizeCode("k7m2x9qp4tvwhc3d"), "k7m2x9qp4tvwhc3d");
    return true;
}

(:test)
function routeSourceInterpretsResponses(logger as Logger) as Boolean {
    var route = {"v" => 1, "n" => "x", "j" => [[93, 5171976, 536379]]};
    Test.assertEqual(RouteSource.interpret(200, route), RouteSource.RECEIVED);
    Test.assertEqual(RouteSource.interpret(200, {"v" => 2}), RouteSource.FAILED);
    Test.assertEqual(RouteSource.interpret(200, "tekst"), RouteSource.FAILED);
    Test.assertEqual(RouteSource.interpret(401, null), RouteSource.WRONG_KEY);
    Test.assertEqual(RouteSource.interpret(404, null), RouteSource.NOTHING_SENT);
    Test.assertEqual(RouteSource.interpret(-104, null), RouteSource.NO_CONNECTION);
    Test.assertEqual(RouteSource.interpret(-402, null), RouteSource.FAILED);
    Test.assertEqual(RouteSource.interpret(429, null), RouteSource.BUSY);
    return true;
}

(:test)
function routeComparesByContent(logger as Logger) as Boolean {
    var a = Route.fromJson({"v" => 1, "n" => "x", "j" => [[93, 1, 2], [5]]});
    var b = Route.fromJson({"v" => 1, "n" => "x", "j" => [[93, 1, 2], [5]]});
    var c = Route.fromJson({"v" => 1, "n" => "x", "j" => [[93, 1, 3], [5]]});
    var d = Route.fromJson({"v" => 1, "n" => "y", "j" => [[93, 1, 2], [5]]});
    Test.assert(a.sameAs(b));
    Test.assert(!a.sameAs(c));
    Test.assert(!a.sameAs(d));
    return true;
}

(:test)
function navigatorRestartsWithNewRoute(logger as Logger) as Boolean {
    var nav = roundTrip();
    nav.next();
    nav.setRoute(Route.fromJson({"v" => 1, "n" => "nieuw", "j" => [[7], [8]]}));
    Test.assertEqual(nav.index(), 0);
    Test.assertEqual(nav.current().number, 7);
    Test.assertEqual(nav.count(), 2);
    return true;
}
