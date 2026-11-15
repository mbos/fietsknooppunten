// @ts-check
// Koppelcode: 16 tekens zonder tekens die op elkaar lijken (i, l, o, 0, 1).
// Zelfde regels als normalizeCode in worker/src/index.js.

export const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const LENGTH = 16;

/** Nieuwe willekeurige code (~79 bits), zonder modulo-scheefheid. */
export function generateCode() {
  let code = "";
  const limit = 256 - (256 % ALPHABET.length);
  while (code.length < LENGTH) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
    for (const b of bytes) {
      if (b < limit && code.length < LENGTH) code += ALPHABET[b % ALPHABET.length];
    }
  }
  return code;
}

/** "K7M2-X9QP 4TVW-HC3D" -> "k7m2x9qp4tvwhc3d", of null. @param {string} text */
export function normalizeCode(text) {
  const code = text.toLowerCase().replace(/[\s-]/g, "");
  if (code.length !== LENGTH) return null;
  return [...code].every((c) => ALPHABET.includes(c)) ? code : null;
}

/** "k7m2x9qp4tvwhc3d" -> "k7m2-x9qp-4tvw-hc3d" @param {string} code */
export function formatCode(code) {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}
