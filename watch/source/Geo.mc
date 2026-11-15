import Toybox.Lang;
import Toybox.Math;

//! Afstand en richting tussen twee posities in graden.
//! Position.Location heeft geen afstandsfunctie, dus dat doen we zelf.
//! Rekenen in Double: Float (32 bit) is te grof voor coördinaten in graden.
module Geo {
    const EARTH_RADIUS = 6371000.0d;
    //! Routecoördinaten zijn graden x 100.000, zie docs/route-format.md.
    const ROUTE_SCALE = 100000.0d;

    //! Afstand in meters (haversine).
    function distance(lat1 as Double, lon1 as Double, lat2 as Double, lon2 as Double) as Double {
        var p1 = Math.toRadians(lat1);
        var p2 = Math.toRadians(lat2);
        var dp = p2 - p1;
        var dl = Math.toRadians(lon2 - lon1);
        var sp = Math.sin(dp / 2);
        var sl = Math.sin(dl / 2);
        var h = sp * sp + Math.cos(p1) * Math.cos(p2) * sl * sl;
        return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
    }

    //! Beginrichting van 1 naar 2 in graden: 0 = noord, 90 = oost, 0 <= x < 360.
    function bearing(lat1 as Double, lon1 as Double, lat2 as Double, lon2 as Double) as Double {
        var p1 = Math.toRadians(lat1);
        var p2 = Math.toRadians(lat2);
        var dl = Math.toRadians(lon2 - lon1);
        var y = Math.sin(dl) * Math.cos(p2);
        var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
        return normalize(Math.toDegrees(Math.atan2(y, x)).toDouble());
    }

    //! Hoek terugbrengen tot 0 <= x < 360.
    function normalize(degrees as Double) as Double {
        var d = degrees - 360.0d * Math.floor(degrees / 360.0d);
        return d >= 360.0d ? 0.0d : d;
    }

    //! Afstand van een positie tot een routestap, of null als de stap geen locatie heeft.
    function distanceToStep(lat as Double, lon as Double, step as RouteStep) as Double? {
        var sLat = step.lat;
        var sLon = step.lon;
        if (sLat == null || sLon == null) {
            return null;
        }
        return distance(lat, lon, sLat / ROUTE_SCALE, sLon / ROUTE_SCALE);
    }

    //! Richting van een positie naar een routestap, of null als de stap geen locatie heeft.
    function bearingToStep(lat as Double, lon as Double, step as RouteStep) as Double? {
        var sLat = step.lat;
        var sLon = step.lon;
        if (sLat == null || sLon == null) {
            return null;
        }
        return bearing(lat, lon, sLat / ROUTE_SCALE, sLon / ROUTE_SCALE);
    }
}
