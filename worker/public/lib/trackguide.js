// @ts-check
// Track vereenvoudigen en afslagen bepalen (ticket 08, regels in docs/route-format.md).
import { bearing, distance, EARTH_RADIUS } from "./geo.js";

/** @typedef {import("./route.js").Coordinate} Coordinate */

export const TOLERANCE = 10;
export const MERGE_DISTANCE = 40;
export const MIN_TURN_ANGLE = 45;
export const SHARP_TURN_ANGLE = 120;

/** Douglas-Peucker in een plat vlak rond het eerste punt. @param {Coordinate[]} points */
export function simplify(points, tolerance = TOLERANCE) {
  if (points.length <= 2) return points;
  const perLat = EARTH_RADIUS * Math.PI / 180;
  const perLon = perLat * Math.cos(points[0].lat * Math.PI / 180);
  const xy = points.map((c) => ({ x: (c.lon - points[0].lon) * perLon, y: (c.lat - points[0].lat) * perLat }));
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  /** @type {[number, number][]} */
  const stack = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = /** @type {[number, number]} */ (stack.pop());
    if (last <= first + 1) continue;
    let worst = first, worstDistance = 0;
    for (let i = first + 1; i < last; i++) {
      const d = segmentDistance(xy[i], xy[first], xy[last]);
      if (d > worstDistance) { worst = i; worstDistance = d; }
    }
    if (worstDistance > tolerance) {
      keep[worst] = true;
      stack.push([first, worst], [worst, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * Afslagen: [index van het trackpunt, richting] met -2 scherp links, -1 links, 1 rechts, 2 scherp rechts.
 * @param {Coordinate[]} points
 * @returns {[number, number][]}
 */
export function turns(points) {
  if (points.length <= 2) return [];
  /** @type {[number, number][]} */
  const result = [];
  let i = 1;
  while (i < points.length - 1) {
    const start = i;
    let angle = change(i, points);
    while (i + 1 < points.length - 1 && distance(points[i], points[i + 1]) <= MERGE_DISTANCE) {
      i += 1;
      angle += change(i, points);
    }
    if (Math.abs(angle) >= MIN_TURN_ANGLE) {
      const sharp = Math.abs(angle) >= SHARP_TURN_ANGLE;
      result.push([start, (angle > 0 ? 1 : -1) * (sharp ? 2 : 1)]);
    }
    i += 1;
  }
  return result;
}

/** Koerswijziging bij punt i, tussen -180 en 180 graden. @param {number} i @param {Coordinate[]} points */
export function change(i, points) {
  let delta = bearing(points[i], points[i + 1]) - bearing(points[i - 1], points[i]);
  while (delta > 180) delta -= 360;
  while (delta <= -180) delta += 360;
  return delta;
}

/** @param {{x: number, y: number}} p @param {{x: number, y: number}} a @param {{x: number, y: number}} b */
function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  let t = lengthSquared === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
  t = Math.min(1, Math.max(0, t));
  const cx = a.x + t * dx - p.x, cy = a.y + t * dy - p.y;
  return Math.sqrt(cx * cx + cy * cy);
}
