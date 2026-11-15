# Beveiliging van de webapp en de Worker

Review van 13-11-2026 (https://fietsknooppunten.deboskes.eu en `worker/`).

## Certificaat en TLS

- **Certificaat:** uitgegeven door **Google Trust Services (WE1)**, gemeten op 13-11-2026. Het geldt voor `deboskes.eu`, `fietsknooppunten.deboskes.eu` en `*.fietsknooppunten.deboskes.eu`, en loopt van 13-11-2026 tot 11-02-2027 (90 dagen).
  - Cloudflare beheert het: het werd aangemaakt toen het Custom Domain werd ingesteld, en Cloudflare vernieuwt het vóór de vervaldatum.
  - Er is niets te roteren of te doen. Controleer het met: `echo | openssl s_client -connect fietsknooppunten.deboskes.eu:443 -servername fietsknooppunten.deboskes.eu 2>/dev/null | openssl x509 -noout -issuer -dates`.
- **HSTS:** de header staat op alle antwoorden (1 jaar). Na het eerste bezoek gebruikt een browser alleen nog HTTPS.
- **Dashboard-instellingen** (deboskes.eu › SSL/TLS › Edge Certificates), ingesteld door de maintainer en gecontroleerd op 13-11-2026:
  - **Always Use HTTPS:** aan. `http://` geeft nu een 301 naar `https://`.
  - **Minimum TLS Version:** 1.2. Een verbinding met TLS 1.1 wordt geweigerd; TLS 1.2 geeft 200.

## Invoer

| Invoer | Waar | Maatregel |
|---|---|---|
| Routenaam, nummers, GPX-namen, plaatsnamen | webapp | Alles komt via `textContent` en attributen in de pagina, nooit via `innerHTML`, `eval` of inline handlers. Gecontroleerd met grep; er zijn geen voorkomens. HTML in een routenaam blijft dus gewoon tekst. |
| GPX-bestand | webapp | Een eigen strikte XML-lezer (`lib/xml.js`): alleen de vijf vaste entiteiten en tekenreferenties. Een `<!DOCTYPE>` wordt overgeslagen, dus er zijn geen eigen entiteiten, geen XXE en geen "billion laughs". Maximaal 20 MB. De coördinaten worden op bereik gecontroleerd. |
| Koppelcode | webapp en Worker | Alleen 16 tekens uit een vast alfabet. Al het andere geeft `401`. |
| Route (PUT) | Worker | `validate()` controleert het formaat volledig: integers, bereik 1–99, track en afslagen. De body is maximaal 16 KB, gecontroleerd op `Content-Length` én tijdens het lezen (ook bij chunked uploads). Opgeslagen wordt de opnieuw geserialiseerde JSON, niet de ruwe body. |
| SQL | Worker | Alleen prepared statements met `bind()`; er wordt nooit tekst in SQL geplakt. |
| localStorage | webapp | Kapotte of geblokkeerde opslag geeft een lege staat, geen crash. |

## Headers

- **Webapp** (`worker/public/_headers`):
  - **Content-Security-Policy:** `default-src 'none'` met alleen eigen scripts, styles en `fetch`, plus `frame-ancestors 'none'`. Inline scripts of styles komen niet voor. De CSP vangt een eventuele XSS dus ook nog af.
  - **Overige headers:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, een `Permissions-Policy` zonder camera, microfoon of locatie, en COOP/CORP `same-origin`.
- **API** (`/route`): `Cache-Control: no-store` (routes zijn privé), `nosniff` en `default-src 'none'`.
- **CORS:** de API stuurt geen CORS-headers. Andere websites kunnen dus vanuit de browser geen routes lezen of versturen: de preflight krijgt `401` zonder `Access-Control-Allow-*`.

## Toegang en privacy

- **Koppelcode:** ongeveer 79 bits willekeur (`crypto.getRandomValues`, zonder modulo-scheefheid). Raden kan niet: zelfs bij een miljoen pogingen per seconde duurt het gemiddeld miljoenen jaren.
  - De code staat alleen in de `Authorization`-header, nooit in een URL, dus ook niet in logs of in de geschiedenis.
  - In D1 staat alleen de SHA-256 ervan.
- **IP-adressen** (voor de schrijflimiet): gehasht met een **geheime salt en de datum**. Zonder salt is de hash van een IPv4-adres binnen minuten terug te rekenen.
  - Het secret `IP_SALT` is gezet op 13-11-2026.
  - Tellers worden dagelijks verwijderd.
- **Oude privé-sleutel (`API_KEY`):** verwijderd op 13-11-2026, samen met de KV-opslag. Alleen koppelcodes werken nog.
- **Bewaartermijn:** routes die 90 dagen niet gebruikt zijn, worden automatisch verwijderd (Cron Trigger).

## Resterende risico's

1. **Het gratis dagquotum opmaken** (100.000 requests).
   - Iemand die veel requests stuurt, kan de dienst tot 00:00 UTC laten haperen. Er komt dan een foutmelding, geen rekening.
   - Het quotum ligt aan de kant van Cloudflare en is niet in de Worker zelf af te vangen.
   - **Maatregel:** een rate-limiting-regel in de WAF van deboskes.eu voor `/route`, bijvoorbeeld een blokkade per IP-adres boven een paar requests per 10 seconden. Volgens Cloudflare zit er één zo'n regel in het gratis plan; controleer dat in het dashboard.
   - `*.workers.dev` en preview-URL's staan uit (`workers_dev = false`), dus al het verkeer loopt via het eigen domein en de instellingen van die zone.
2. **Een gedeelde code is gedeelde toegang.** Wie je code kent, kan je route lezen en overschrijven. De privacypagina zegt dat.
3. **Gedeelde computer:** routes en code staan in de localStorage van die browser.
4. **Afhankelijkheden:** de site heeft geen runtime-dependencies. `wrangler` en `jsdom` zijn alleen voor ontwikkelen en testen.

## Tests

`cd worker && npm test` bevat tests voor:
- codes en limieten;
- te grote bodies (ook chunked);
- de headers op API-antwoorden;
- de IP-hash met salt;
- de XML-lezer;
- een paginatest in jsdom.
