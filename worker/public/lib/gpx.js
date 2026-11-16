// @ts-check
// GPX importeren (export van de ANWB-planner).
// - Waypoints met een knooppuntnummer als naam ("Knooppunt 05") worden stappen.
// - Opeenvolgende waypoints met hetzelfde nummer binnen 200 m zijn één knooppunt.
// - De track gaat mee (vereenvoudigd bij het versturen, zie route.encode).
import { centroid, distance } from "./geo.js";
import { t } from "./i18n.js";
import { parseNumber } from "./numbers.js";
import { createRoute } from "./route.js";
import { parseXml } from "./xml.js";

export const MERGE_DISTANCE = 200;

export class GpxError extends Error {}

/**
 * @param {string} text inhoud van het GPX-bestand
 * @param {string} fallbackName naam als het bestand er geen heeft (bv. de bestandsnaam)
 */
export function importGpx(text, fallbackName) {
  const doc = readGpx(text);
  /** @type {{number: number, points: import("./route.js").Coordinate[]}[]} */
  const clusters = [];
  for (const w of doc.waypoints) {
    const number = w.name === null ? null : parseNumber(w.name);
    if (number === null) continue;
    const last = clusters.at(-1);
    if (last && last.number === number && last.points.some((p) => distance(p, w.coordinate) <= MERGE_DISTANCE)) {
      last.points.push(w.coordinate);
    } else {
      clusters.push({ number, points: [w.coordinate] });
    }
  }
  if (clusters.length === 0) {
    throw new GpxError(t("gpx.noJunctions"));
  }
  const name = doc.name?.trim();
  const route = createRoute(name || fallbackName);
  route.steps = clusters.map((c) => ({ id: globalThis.crypto.randomUUID(), number: c.number, coordinate: centroid(c.points) }));
  route.track = doc.trackPoints.length > 0 ? doc.trackPoints : null;
  return route;
}

/** @param {string} text */
function readGpx(text) {
  /** @type {{coordinate: import("./route.js").Coordinate, name: string | null}[]} */
  const waypoints = [];
  /** @type {import("./route.js").Coordinate[]} */
  const trackPoints = [];
  /** @type {string[]} */
  const path = [];
  let buffer = "";
  /** @type {{coordinate: import("./route.js").Coordinate, name: string | null} | null} */
  let pending = null;
  /** @type {string | null} */
  let trackName = null;
  /** @type {string | null} */
  let documentName = null;
  let root = "";
  try {
    parseXml(text, {
      start(name, attributes) {
        if (path.length === 0) root = name;
        path.push(name);
        buffer = "";
        if (name === "wpt") {
          const c = coordinate(attributes);
          pending = c ? { coordinate: c, name: null } : null;
        } else if (name === "trkpt") {
          const c = coordinate(attributes);
          if (c) trackPoints.push(c);
        }
      },
      text(t) {
        buffer += t;
      },
      end(name) {
        const parent = path.at(-2);
        if (name === "name" && parent === "wpt" && pending) pending.name = buffer;
        else if (name === "name" && parent === "trk" && trackName === null) trackName = buffer;
        else if (name === "name" && (parent === "gpx" || parent === "metadata")) documentName = buffer;
        else if (name === "wpt") {
          if (pending) waypoints.push(pending);
          pending = null;
        }
        path.pop();
        buffer = "";
      },
    });
  } catch (error) {
    throw new GpxError(t("gpx.invalid", /** @type {Error} */ (error).message));
  }
  if (root !== "gpx") throw new GpxError(t("gpx.invalid", t("gpx.noRoot")));
  // De namen worden in de callbacks hierboven gezet; zonder cast denkt TypeScript dat ze null blijven.
  const name = /** @type {string | null} */ (trackName ?? documentName);
  return { name, waypoints, trackPoints };
}

/** @param {Record<string, string>} attributes */
function coordinate(attributes) {
  const lat = Number(attributes.lat), lon = Number(attributes.lon);
  if (attributes.lat === undefined || attributes.lon === undefined || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}
