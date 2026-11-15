// Cloudflare Worker: bewaart per koppelcode de route die de webapp verstuurt, zodat het
// horloge hem kan ophalen. Opslag in D1 (ticket publiek/03). Serveert ook de webapp (public/).
//
//   PUT /route   body: route in het formaat van docs/route-format.md
//   GET /route   antwoord: diezelfde JSON
//
// Beide met "Authorization: Bearer <koppelcode>". Een koppelcode is 16 tekens uit
// CODE_ALPHABET (hoofdletters, spaties en streepjes tellen niet mee). Wie de code niet
// kent, kan de route niet lezen of overschrijven. In D1 staat alleen de SHA-256 van de code.

const MAX_BODY_BYTES = 16 * 1024;
export const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // zonder i, l, o, 0, 1
export const CODE_LENGTH = 16;
export const LIMITS = { writesPerCode: 50, writesPerIp: 200 };
const DAY_MS = 24 * 3600 * 1000;
export const RETENTION_DAYS = 90;

export default {
  async fetch(request, env) {
    const now = clock(env);
    const url = new URL(request.url);
    if (url.pathname !== "/route") {
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return json({ error: "not found" }, 404);
    }
    const code = await codeHash(request, env);
    if (!code) {
      return json({ error: "unauthorized" }, 401);
    }
    if (request.method === "GET") return getRoute(env, code, now);
    if (request.method === "PUT") return putRoute(request, env, code, now);
    return json({ error: "method not allowed" }, 405, { Allow: "GET, PUT" });
  },

  // Dagelijks (Cron Trigger): oude routes en tellers opruimen.
  async scheduled(_event, env) {
    await cleanUp(env, clock(env));
  },
};

async function getRoute(env, code, now) {
  const row = await env.DB.prepare("SELECT json FROM routes WHERE code_hash = ?").bind(code.hash).first();
  if (!row) {
    return json({ error: "no route" }, 404);
  }
  // Bijhouden dat de route nog gebruikt wordt, maar hooguit één schrijfactie per dag.
  await env.DB.prepare("UPDATE routes SET fetched_at = ? WHERE code_hash = ? AND fetched_at < ?")
    .bind(now, code.hash, now - DAY_MS).run();
  return new Response(row.json, { headers: { "Content-Type": "application/json", ...API_HEADERS } });
}

async function putRoute(request, env, code, now) {
  const body = await readLimited(request, MAX_BODY_BYTES);
  if (body === null) {
    return json({ error: "too large" }, 413);
  }
  let route;
  try {
    route = JSON.parse(body);
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const problem = validate(route);
  if (problem) {
    return json({ error: problem }, 400);
  }
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const day = new Date(now).toISOString().slice(0, 10);
  // IP-adressen met een geheime salt en de datum hashen: zonder salt is een hash van
  // een IPv4-adres binnen minuten terug te rekenen (2^32 mogelijkheden).
  const ipKey = await sha256Hex(`ip:${env.IP_SALT ?? ""}:${day}:${ip}`);
  if (!(await withinLimit(env, `code:${code.hash}`, day, LIMITS.writesPerCode))
      || !(await withinLimit(env, `ip:${ipKey}`, day, LIMITS.writesPerIp))) {
    return json({ error: "too many requests" }, 429, { "Retry-After": "3600" });
  }
  await env.DB.prepare(
    `INSERT INTO routes (code_hash, json, updated_at, fetched_at) VALUES (?1, ?2, ?3, ?3)
     ON CONFLICT(code_hash) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`,
  ).bind(code.hash, JSON.stringify(route), now).run();
  return json({ ok: true, steps: route.j.length });
}

/**
 * Leest de body tot `limit` bytes; null als hij groter is. Kijkt eerst naar
 * Content-Length en leest daarna in stukken, zodat een grote upload niet in het geheugen komt.
 */
async function readLimited(request, limit) {
  const declared = Number(request.headers.get("Content-Length") ?? 0);
  if (declared > limit) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** Telt één schrijfactie; false als de daglimiet daarmee overschreden wordt. */
async function withinLimit(env, key, day, limit) {
  const row = await env.DB.prepare(
    `INSERT INTO counters (key, day, count) VALUES (?1, ?2, 1)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN counters.day = excluded.day THEN counters.count + 1 ELSE 1 END,
       day = excluded.day
     RETURNING count`,
  ).bind(key, day).first();
  return row.count <= limit;
}

/** Routes die 90 dagen niet zijn verstuurd of opgehaald, en tellers van eerdere dagen. */
export async function cleanUp(env, now) {
  const cutoff = now - RETENTION_DAYS * DAY_MS;
  const today = new Date(now).toISOString().slice(0, 10);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM routes WHERE updated_at < ?1 AND fetched_at < ?1").bind(cutoff),
    env.DB.prepare("DELETE FROM counters WHERE day < ?").bind(today),
  ]);
}

/** "AbCd-efgh jkmn-pqrs" -> "abcdefghjkmnpqrs", of null als het geen geldige code is. */
export function normalizeCode(text) {
  const code = text.toLowerCase().replace(/[\s-]/g, "");
  if (code.length !== CODE_LENGTH) return null;
  for (const ch of code) if (!CODE_ALPHABET.includes(ch)) return null;
  return code;
}

async function codeHash(request, env) {
  const header = request.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const code = normalizeCode(header.slice("Bearer ".length).trim());
  return code ? { hash: await sha256Hex(`code:${code}`) } : null;
}

/** Controleert het routeformaat v1; geeft een foutmelding of null. */
export function validate(route) {
  if (typeof route !== "object" || route === null || Array.isArray(route)) return "not an object";
  if (route.v !== 1) return "unsupported version";
  if (typeof route.n !== "string") return "missing name";
  if (!Array.isArray(route.j) || route.j.length === 0) return "no steps";
  for (const step of route.j) {
    if (!Array.isArray(step) || (step.length !== 1 && step.length !== 3)) return "malformed step";
    if (!step.every(Number.isInteger)) return "malformed step";
    if (step[0] < 1 || step[0] > 99) return "malformed step";
  }
  // Optioneel (ticket 08): vereenvoudigde track als delta's en afslagen.
  if (route.t !== undefined) {
    if (!Array.isArray(route.t) || route.t.length < 2) return "malformed track";
    for (const point of route.t) {
      if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isInteger)) return "malformed track";
    }
  }
  if (route.b !== undefined) {
    if (route.t === undefined || !Array.isArray(route.b)) return "malformed turns";
    for (const turn of route.b) {
      if (!Array.isArray(turn) || turn.length !== 2 || !turn.every(Number.isInteger)) return "malformed turns";
      const [index, direction] = turn;
      if (index < 1 || index > route.t.length - 2) return "malformed turns";
      if (![-2, -1, 1, 2].includes(direction)) return "malformed turns";
    }
  }
  return null;
}

async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

async function sha256Hex(text) {
  return [...(await sha256(text))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function clock(env) {
  return env.NOW ? env.NOW() : Date.now();
}

/** Voor alle antwoorden van /route: niet cachen (privé-data), niet sniffen, niet inbedden. */
const API_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Referrer-Policy": "no-referrer",
};

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...API_HEADERS, ...headers },
  });
}
