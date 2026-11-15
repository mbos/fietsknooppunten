-- Routes per koppelcode. De code zelf wordt niet bewaard, alleen de SHA-256 ervan.
CREATE TABLE routes (
    code_hash  TEXT PRIMARY KEY,
    json       TEXT NOT NULL,
    updated_at INTEGER NOT NULL,  -- ms sinds 1970, laatste PUT
    fetched_at INTEGER NOT NULL   -- ms sinds 1970, laatste GET (hooguit 1x per dag bijgewerkt)
);

-- Tellers tegen misbruik: schrijfacties per code en per IP-adres (gehasht) per dag.
CREATE TABLE counters (
    key   TEXT PRIMARY KEY,
    day   TEXT NOT NULL,          -- YYYY-MM-DD (UTC)
    count INTEGER NOT NULL
);
