// @ts-check
// Bewaart routes en de koppelcode in de browser (localStorage). Geen account, geen server.
// Werkt ook als opslag geblokkeerd is (privévenster): dan alleen voor deze sessie.

const KEY = "fietsknooppunten.v1";

/** @typedef {{code: string | null, routes: import("./route.js").Route[], selected: string | null, lang?: "nl" | "en"}} State */

/** @param {Storage | undefined} [storage] @returns {State} */
export function load(storage = safeStorage()) {
  try {
    const raw = storage?.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.routes)) {
        /** @type {State} */
        const state = { code: typeof data.code === "string" ? data.code : null, routes: data.routes, selected: data.selected ?? null };
        if (data.lang === "nl" || data.lang === "en") state.lang = data.lang;
        return state;
      }
    }
  } catch {
    // kapotte of geblokkeerde opslag: opnieuw beginnen
  }
  return { code: null, routes: [], selected: null };
}

/** @param {State} state @param {Storage | undefined} [storage] */
export function save(state, storage = safeStorage()) {
  try {
    storage?.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function safeStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
