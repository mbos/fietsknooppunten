// @ts-check
// Knooppuntnummers lezen zoals mensen en GPX-bestanden ze schrijven.

export const MIN = 1;
export const MAX = 99;

/** "05", "5" en "Knooppunt 05" geven 5; anders null. @param {string} text */
export function parseNumber(text) {
  let s = text.trim();
  if (s.toLowerCase().startsWith("knooppunt")) s = s.slice("knooppunt".length).trim();
  if (!/^[0-9]+$/.test(s)) return null;
  const n = Number(s);
  return n >= MIN && n <= MAX ? n : null;
}

/**
 * "93 99-94, 80 → 05" -> {numbers: [93, 99, 94, 80, 5]}; ongeldige stukken in `invalid`.
 * @param {string} text
 * @returns {{numbers: number[], invalid: string[]}}
 */
export function parseSequence(text) {
  const tokens = text.split(/[ ,;\-→>\t\n]+/).filter((t) => t.length > 0);
  const invalid = tokens.filter((t) => parseNumber(t) === null);
  return invalid.length > 0
    ? { numbers: [], invalid }
    : { numbers: tokens.map((t) => /** @type {number} */ (parseNumber(t))), invalid: [] };
}
