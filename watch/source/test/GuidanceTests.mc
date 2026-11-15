import Toybox.Lang;
import Toybox.Math;
import Toybox.Test;

// Knooppunten uit lokaal.gpx (zie resources/jsonData/route.json).
const K93 = [93, 5171976, 536379];
const K99 = [99, 5171068, 537615];
const K94 = [94, 5170410, 538580];

function near(actual as Double, expected as Double, tolerance as Double) as Boolean {
    return (actual - expected).abs() <= tolerance;
}

//! Positie ~30 m ten noorden van een knooppunt (binnen de aankomststraal van 50 m).
function lat(junction as Array<Number>) as Double {
    return junction[1] / 100000.0d + 0.00027d;
}

function lon(junction as Array<Number>) as Double {
    return junction[2] / 100000.0d;
}

function loop() as RouteNavigator {
    return new RouteNavigator(Route.fromJson({"v" => 1, "n" => "rondje", "j" => [K93, K99, K94, K93]}));
}

(:test)
function geoDistanceBetween93And99(logger as Logger) as Boolean {
    var d = Geo.distance(51.71976d, 5.36379d, 51.71068d, 5.37615d);
    logger.debug("93 -> 99: " + d);
    return near(d, 1320.8d, 1.0d);
}

(:test)
function geoBearingBetween93And99(logger as Logger) as Boolean {
    Test.assert(near(Geo.bearing(51.71976d, 5.36379d, 51.71068d, 5.37615d), 139.85d, 0.5d));
    Test.assert(near(Geo.bearing(51.71068d, 5.37615d, 51.71976d, 5.36379d), 319.86d, 0.5d));
    return true;
}

(:test)
function geoBearingAroundNorth(logger as Logger) as Boolean {
    var westOfNorth = Geo.bearing(51.0d, 5.0d, 51.01d, 4.9999d);
    var eastOfNorth = Geo.bearing(51.0d, 5.0d, 51.01d, 5.0001d);
    Test.assert(westOfNorth > 359.0d && westOfNorth < 360.0d);
    Test.assert(eastOfNorth >= 0.0d && eastOfNorth < 1.0d);
    Test.assert(near(Geo.normalize(-10.0d), 350.0d, 0.001d));
    Test.assert(near(Geo.normalize(360.0d), 0.0d, 0.001d));
    Test.assert(near(Geo.normalize(725.0d), 5.0d, 0.001d));
    return true;
}

(:test)
function formatsDistanceToJunction(logger as Logger) as Boolean {
    Test.assertEqual(Format.distance(0.0d), "0 m");
    Test.assertEqual(Format.distance(47.0d), "50 m");
    Test.assertEqual(Format.distance(194.0d), "190 m");
    Test.assertEqual(Format.distance(199.0d), "200 m");
    Test.assertEqual(Format.distance(860.0d), "850 m");
    Test.assertEqual(Format.distance(999.0d), "1,0 km");
    Test.assertEqual(Format.distance(1000.0d), "1,0 km");
    Test.assertEqual(Format.distance(12345.0d), "12,3 km");
    return true;
}

(:test)
function trackerNeedsTwoFixesBeforeAdvancing(logger as Logger) as Boolean {
    var nav = loop();
    var tracker = new ArrivalTracker(nav);
    Test.assert(!tracker.update(lat(K93), lon(K93)));
    Test.assertEqual(nav.index(), 0);
    Test.assert(tracker.update(lat(K93), lon(K93)));
    Test.assertEqual(nav.index(), 1);
    return true;
}

(:test)
function trackerIgnoresFixesFarAway(logger as Logger) as Boolean {
    var nav = loop();
    var tracker = new ArrivalTracker(nav);
    for (var i = 0; i < 5; i++) {
        Test.assert(!tracker.update(51.73d, 5.36379d));
    }
    Test.assertEqual(nav.index(), 0);
    return true;
}

//! Rondrit 93 -> 99 -> 94 -> 93: blijven staan bij de eerste 93 mag niet doorspringen
//! naar de laatste 93; bij de laatste blijft hij staan en trilt hij één keer.
(:test)
function trackerRidesRoundTrip(logger as Logger) as Boolean {
    var nav = loop();
    var tracker = new ArrivalTracker(nav);
    tracker.update(lat(K93), lon(K93));
    tracker.update(lat(K93), lon(K93));
    for (var i = 0; i < 5; i++) {
        Test.assert(!tracker.update(lat(K93), lon(K93)));
    }
    Test.assertEqual(nav.index(), 1);

    tracker.update(lat(K99), lon(K99));
    Test.assert(tracker.update(lat(K99), lon(K99)));
    Test.assertEqual(nav.index(), 2);

    tracker.update(lat(K94), lon(K94));
    Test.assert(tracker.update(lat(K94), lon(K94)));
    Test.assertEqual(nav.index(), 3);

    tracker.update(lat(K93), lon(K93));
    Test.assert(tracker.update(lat(K93), lon(K93)));
    Test.assertEqual(nav.index(), 3);
    Test.assert(!tracker.update(lat(K93), lon(K93)));
    Test.assert(!tracker.update(lat(K93), lon(K93)));
    return true;
}

(:test)
function trackerCatchesUpWhenJunctionWasMissed(logger as Logger) as Boolean {
    var nav = loop();
    var tracker = new ArrivalTracker(nav);
    tracker.update(lat(K94), lon(K94));
    Test.assert(tracker.update(lat(K94), lon(K94)));
    Test.assertEqual(nav.index(), 3);
    return true;
}

//! Met UP terug naar het knooppunt waar je staat: dan niet meteen weer doorspringen.
(:test)
function trackerRespectsManualChoice(logger as Logger) as Boolean {
    var nav = loop();
    var tracker = new ArrivalTracker(nav);
    tracker.update(lat(K93), lon(K93));
    tracker.update(lat(K93), lon(K93));
    Test.assertEqual(nav.index(), 1);
    nav.previous();
    for (var i = 0; i < 5; i++) {
        Test.assert(!tracker.update(lat(K93), lon(K93)));
    }
    Test.assertEqual(nav.index(), 0);

    // Handmatig vooruit en dan verder fietsen: detectie gaat vanaf daar verder.
    nav.next();
    nav.next();
    Test.assert(!tracker.update(lat(K99), lon(K99)));
    tracker.update(lat(K94), lon(K94));
    Test.assert(tracker.update(lat(K94), lon(K94)));
    Test.assertEqual(nav.index(), 3);
    return true;
}

(:test)
function trackerSkipsStepsWithoutLocation(logger as Logger) as Boolean {
    var nav = new RouteNavigator(Route.fromJson({"v" => 1, "n" => "x", "j" => [[5], K99, K94]}));
    var tracker = new ArrivalTracker(nav);
    tracker.update(lat(K99), lon(K99));
    Test.assert(tracker.update(lat(K99), lon(K99)));
    Test.assertEqual(nav.index(), 2);
    return true;
}
