// @ts-check
// Afstand, middelpunt en richting op de aardbol.

export const EARTH_RADIUS = 6_371_000;

/** @typedef {import("./route.js").Coordinate} Coordinate */

/** Afstand in meters (haversine). @param {Coordinate} a @param {Coordinate} b */
export function distance(a, b) {
  const lat1 = a.lat * Math.PI / 180, lat2 = b.lat * Math.PI / 180;
  const dLat = lat2 - lat1;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Gemiddelde van een kleine groep punten. @param {Coordinate[]} points */
export function centroid(points) {
  if (points.length === 0) return null;
  const n = points.length;
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / n,
    lon: points.reduce((s, p) => s + p.lon, 0) / n,
  };
}

/** Beginrichting van a naar b in graden (0 = noord, 90 = oost). @param {Coordinate} a @param {Coordinate} b */
export function bearing(a, b) {
  const lat1 = a.lat * Math.PI / 180, lat2 = b.lat * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const degrees = Math.atan2(y, x) * 180 / Math.PI;
  return degrees < 0 ? degrees + 360 : degrees;
}
