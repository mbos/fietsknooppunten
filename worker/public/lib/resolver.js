// @ts-check
// Locaties van knooppunten kiezen met het statische knooppuntbestand (docs/knooppuntbestand.md).
import { centroid, distance } from "./geo.js";
import { t } from "./i18n.js";
import { SCALE } from "./route.js";

/** @typedef {import("./route.js").Coordinate} Coordinate */
/** @typedef {import("./route.js").Route} Route */
/** @typedef {{number: number, coordinate: Coordinate}} JunctionNode */
/** @typedef {{number: number, points: Coordinate[], center: Coordinate}} Cluster */
/** @typedef {{v: number, date: string, attribution: string, j: number[][], c: number[][], p: [string, number, number][]}} JunctionFile */

export const MERGE_DISTANCE = 200;
export const SEARCH_RADIUS = 40_000;
/** Een verbinding a–b telt als haar punt binnen (afstand a–b + dit) van a en van b ligt. */
export const CONNECTION_SLACK = 1_000;

/** @param {number[]} entry [.., lat, lon] in 1e-5 graad, vanaf index `at` */
const coordinateAt = (entry, at) => ({ lat: entry[at] / SCALE, lon: entry[at + 1] / SCALE });

/**
 * Knooppunten met deze nummers binnen `radius` meter van `anchor`.
 * @param {JunctionFile} file @param {Set<number>} numbers @param {Coordinate} anchor
 * @returns {JunctionNode[]}
 */
export function nodesAround(file, numbers, anchor, radius = SEARCH_RADIUS) {
  /** @type {JunctionNode[]} */
  const result = [];
  for (const entry of file.j) {
    if (!numbers.has(entry[0])) continue;
    const coordinate = coordinateAt(entry, 1);
    if (distance(anchor, coordinate) <= radius) result.push({ number: entry[0], coordinate });
  }
  return result;
}

/**
 * Groepeert nodes per nummer: nodes binnen `mergeDistance` van een node in het cluster
 * horen bij hetzelfde knooppunt. Zelfde volgorde als JunctionCluster.clusters.
 * @param {JunctionNode[]} nodes
 * @returns {Cluster[]}
 */
export function clusters(nodes, mergeDistance = MERGE_DISTANCE) {
  /** @type {Map<number, Coordinate[]>} */
  const byNumber = new Map();
  for (const n of nodes) byNumber.set(n.number, [...(byNumber.get(n.number) ?? []), n.coordinate]);
  /** @type {Cluster[]} */
  const result = [];
  for (const number of [...byNumber.keys()].sort((a, b) => a - b)) {
    const remaining = [.../** @type {Coordinate[]} */ (byNumber.get(number))];
    while (remaining.length > 0) {
      const points = [/** @type {Coordinate} */ (remaining.pop())];
      let grew = true;
      while (grew) {
        grew = false;
        for (let i = remaining.length - 1; i >= 0; i--) {
          const candidate = remaining[i];
          if (points.some((p) => distance(p, candidate) <= mergeDistance)) {
            points.push(candidate);
            remaining.splice(i, 1);
            grew = true;
          }
        }
      }
      result.push({ number, points, center: /** @type {Coordinate} */ (centroid(points)) });
    }
  }
  return result;
}

/**
 * Kiest voor elke stap zonder locatie een knooppunt: de reeks met de kortste totale
 * afstand vanaf `anchor` via alle stappen (Viterbi). Stappen met een locatie liggen vast.
 * Past `route.steps` aan; geeft de nummers terug die niet gevonden zijn.
 * @param {Route} route @param {Coordinate} anchor @param {Cluster[]} options
 * @returns {number[]}
 */
export function resolve(route, anchor, options) {
  /** @type {Map<number, Cluster[]>} */
  const byNumber = new Map();
  for (const c of options) byNumber.set(c.number, [...(byNumber.get(c.number) ?? []), c]);

  /** @type {{stepIndex: number, options: Cluster[]}[]} */
  const candidates = [];
  /** @type {number[]} */
  const missing = [];
  route.steps.forEach((step, index) => {
    if (step.coordinate) {
      candidates.push({ stepIndex: index, options: [{ number: step.number, points: [step.coordinate], center: step.coordinate }] });
    } else if (byNumber.get(step.number)?.length) {
      candidates.push({ stepIndex: index, options: /** @type {Cluster[]} */ (byNumber.get(step.number)) });
    } else if (!missing.includes(step.number)) {
      missing.push(step.number);
    }
  });
  if (candidates.length === 0) return missing;

  let cost = candidates[0].options.map((o) => distance(anchor, o.center));
  /** @type {number[][]} */
  const back = [candidates[0].options.map(() => -1)];
  for (let layer = 1; layer < candidates.length; layer++) {
    const previous = candidates[layer - 1].options;
    /** @type {number[]} */
    const layerCost = [];
    /** @type {number[]} */
    const layerBack = [];
    for (const option of candidates[layer].options) {
      let best = Infinity, bestIndex = 0;
      previous.forEach((prev, p) => {
        const c = cost[p] + distance(prev.center, option.center);
        if (c < best) { best = c; bestIndex = p; }
      });
      layerCost.push(best);
      layerBack.push(bestIndex);
    }
    cost = layerCost;
    back.push(layerBack);
  }

  let choice = cost.indexOf(Math.min(...cost));
  for (let layer = candidates.length - 1; layer >= 0; layer--) {
    const step = route.steps[candidates[layer].stepIndex];
    if (!step.coordinate) step.coordinate = candidates[layer].options[choice].center;
    choice = back[layer][choice];
  }
  return missing;
}

/**
 * Indexen van stappen waarvoor het knooppuntbestand geen fietsverbinding kent vanaf de
 * vorige stap. Nummerparen komen landelijk vaak terug, dus de verbinding moet ook in de
 * buurt liggen (CONNECTION_SLACK).
 * @param {Route} route @param {JunctionFile} file
 */
export function unconnectedSteps(route, file) {
  /** @type {Map<string, Coordinate[]>} */
  const byPair = new Map();
  for (const c of file.c) {
    const key = `${c[0]}-${c[1]}`;
    byPair.set(key, [...(byPair.get(key) ?? []), coordinateAt(c, 2)]);
  }
  /** @type {number[]} */
  const result = [];
  for (let i = 1; i < route.steps.length; i++) {
    const a = route.steps[i - 1], b = route.steps[i];
    if (a.number === b.number || !a.coordinate || !b.coordinate) continue;
    const ca = a.coordinate, cb = b.coordinate;
    const reach = distance(ca, cb) + CONNECTION_SLACK;
    const points = byPair.get(`${Math.min(a.number, b.number)}-${Math.max(a.number, b.number)}`) ?? [];
    if (!points.some((p) => distance(p, ca) <= reach && distance(p, cb) <= reach)) result.push(i);
  }
  return result;
}

/** Hoofdletters, accenten en leestekens tellen niet mee bij zoeken. @param {string} s */
export function searchKey(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Woonplaatsen die met `query` beginnen (daarna: waar het woord in voorkomt).
 * Bij dubbele namen staat de dichtstbijzijnde andere plaats erbij: "Oosterhout, bij Breda".
 * @param {JunctionFile} file @param {string} query
 * @returns {{label: string, coordinate: Coordinate}[]}
 */
export function findPlaces(file, query, limit = 8) {
  const q = searchKey(query);
  if (!q) return [];
  const starts = [], contains = [];
  for (const p of file.p) {
    const key = searchKey(p[0]);
    if (key.startsWith(q)) starts.push(p);
    else if (key.includes(` ${q}`)) contains.push(p);
  }
  const byLength = (/** @type {[string, number, number]} */ a, /** @type {[string, number, number]} */ b) =>
    a[0].length - b[0].length || a[0].localeCompare(b[0], "nl");
  const matches = [...starts.sort(byLength), ...contains.sort(byLength)].slice(0, limit);
  return matches.map((p) => {
    const coordinate = coordinateAt(p, 1);
    const twins = file.p.filter((o) => o[0] === p[0]).length;
    return { label: twins > 1 ? t("place.near", p[0], nearestOther(file, p, coordinate)) : p[0], coordinate };
  });
}

/** @param {JunctionFile} file @param {[string, number, number]} place @param {Coordinate} c */
function nearestOther(file, place, c) {
  let best = "", bestDistance = Infinity;
  for (const o of file.p) {
    if (o[0] === place[0]) continue;
    const d = distance(c, coordinateAt(o, 1));
    if (d < bestDistance) { best = o[0]; bestDistance = d; }
  }
  return best;
}
