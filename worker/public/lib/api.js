// @ts-check
// Route versturen naar de Worker (zelfde origin): PUT /route met de koppelcode.
import { t } from "./i18n.js";

/**
 * @param {string} code
 * @param {string} body JSON uit encode()
 * @param {typeof fetch} [fetcher]
 * @returns {Promise<{ok: true} | {ok: false, message: string}>}
 */
export async function sendRoute(code, body, fetcher = globalThis.fetch.bind(globalThis)) {
  let response;
  try {
    response = await fetcher("/route", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${code}` },
      body,
    });
  } catch {
    return { ok: false, message: t("send.offline") };
  }
  if (response.ok) return { ok: true };
  let reason = "";
  try {
    reason = (await response.json()).error ?? "";
  } catch {
    // geen JSON
  }
  return { ok: false, message: messageFor(response.status, reason) };
}

/** @param {number} status @param {string} reason */
export function messageFor(status, reason) {
  switch (status) {
    case 401: return t("send.unauthorized");
    case 400: return t("send.rejected", reason);
    case 413: return t("send.tooLarge");
    case 429: return t("send.tooMany");
    default: return t("send.server", status);
  }
}
