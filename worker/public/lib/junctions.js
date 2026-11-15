// @ts-check
// Laadt het knooppuntbestand (/data/knooppunten.json) één keer en bewaart het in de
// Cache API, zodat opzoeken daarna ook zonder internet werkt. Elke week wordt een nieuwere
// versie opgehaald als die er is.

const URL_PATH = "/data/knooppunten.json";
const CACHE = "knooppunten-v1";
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;

/** @type {Promise<import("./resolver.js").JunctionFile> | null} */
let loading = null;

/** @returns {Promise<import("./resolver.js").JunctionFile>} */
export function loadJunctionFile() {
  loading ??= load().catch((error) => {
    loading = null; // volgende keer opnieuw proberen
    throw error;
  });
  return loading;
}

async function load() {
  const cache = await openCache();
  const cached = await cache?.match(URL_PATH);
  if (cached) {
    const stamped = Number(cached.headers.get("x-cached-at") ?? 0);
    if (Date.now() - stamped > MAX_AGE_MS) refresh(cache).catch(() => {}); // op de achtergrond
    return cached.json();
  }
  const response = await fetch(URL_PATH);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.clone().text();
  await store(cache, body);
  return JSON.parse(body);
}

/** @param {Cache | null} cache */
async function refresh(cache) {
  const response = await fetch(URL_PATH, { cache: "no-cache" });
  if (response.ok) await store(cache, await response.text());
}

/** @param {Cache | null} cache @param {string} body */
async function store(cache, body) {
  try {
    await cache?.put(URL_PATH, new Response(body, {
      headers: { "Content-Type": "application/json", "x-cached-at": String(Date.now()) },
    }));
  } catch {
    // opslag vol of geblokkeerd: dan alleen voor deze sessie
  }
}

async function openCache() {
  try {
    return await caches.open(CACHE);
  } catch {
    return null;
  }
}
