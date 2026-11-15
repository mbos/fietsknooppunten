# 07: Horloge: publieke versie in de Connect IQ Store

**What to build:** De horloge-app als gewone, gratis app in de Connect IQ Store.
- **App-ID:** een nieuwe app-ID (de beta kan niet worden gepubliceerd).
- **Instelling:** de setting heet "Koppelcode" in plaats van "Sleutel". Spaties, streepjes en hoofdletters in de code maken niet uit.
- **Meldingen:** duidelijke meldingen, ook voor de nieuwe limiet (`429`).
- **Vermelding:** beschrijving en screenshots (`docs/store/`), en een link naar de privacyverklaring (ticket 04).
- **Toestellen** (uit ticket 02): ronde horloges met 5 knoppen en CIQ 5 of hoger: Forerunner 165/170/255/265/570/955/965/970, fēnix 7/8/9, epix 2 (Pro), enduro 3/4, Instinct 3 AMOLED/Crossover AMOLED en MARQ 2/3. Geen Venu, vivoactive, Edge of de semi-octagon Instinct.
- **Layout:** de randpijl, het afslagsymbool en de lijndiktes schalen mee met de schermgrootte (218 tot 466 px). Controleer de leesbaarheid op MIP-schermen.
- **Indienen:** lees de App Review Guidelines in de browser na. Ze waren niet automatisch uit te lezen.

**Blocked by:** 02, 03, 04

**Status:** done (goedgekeurd en gepubliceerd in de Connect IQ Store op 14-11-2026)

- [x] Bouwt voor alle gekozen toestellen zonder waarschuwingen; de bestaande tests slagen
- [x] Een koppelcode met spaties, streepjes of in hoofdletters werkt (test)
- [x] Door de store-review gekomen en gepubliceerd (geüpload op 13-11-2026, gepubliceerd op 14-11-2026)
- [x] De maintainer heeft de publieke versie getest. Daarna is de privé-opzet opgeruimd: de beta-app, `API_KEY`, de KV-opslag en de Mac-app (`mac/`). De webapp vervangt de Mac-app (besluit van de maintainer). Ook `CLAUDE.md` en `docs/` zijn bijgewerkt.

## Comments

**2026-11-13 (Claude):**
- **Nieuwe app-ID:** `851dfaf1a887407fae500bacfdad4488`.
- **Toestellen:** 48 in het manifest (59 builds, inclusief varianten), zoals aanbevolen in ticket 02. Alleen waarschuwingen over het schalen van het launcher-icoon (65 → 40/60 px). Die schaalt de SDK zelf.
- **Instelling:** "Koppelcode", alphaNumeric en zichtbaar, in plaats van "Sleutel" (password).
  - `RouteSource.normalizeCode` negeert hoofdletters, spaties en streepjes, net als de Worker.
  - De oude privé-sleutel (hex) blijft geldig.
- **Server en meldingen:**
  - Het adres is nu `https://fietsknooppunten.deboskes.eu/route`.
  - Nieuwe melding bij 429: "server is druk, probeer later".
  - Bij "geen route" verwijst het scherm naar de webapp.
- **Layout:** pijlen, het afslagsymbool en de lijndiktes schalen met `w / 454` (`RouteView.px`).
- **Bugfix voor oudere toestellen:** `Position.CONFIGURATION_SAT_IQ` werd zonder `has`-controle gebruikt. Op toestellen zonder SatIQ (FR255, fēnix 7) was dat een crash bij het starten.
- **Tests:** 29 tests op fr970, fr255s (218 px, MIP) en fenix7. 2 nieuwe tests voor de code-normalisatie en 429.
- **Store-tekst:** in `docs/store/beschrijving.md`, inclusief uitleg bij de permissies voor de review.

**2026-11-13 (Claude), lokalisatie (verzoek van de maintainer, meegenomen in 07, vóór de eerste publieke versie):**
- **Horloge:** Engels is de standaard (`resources/strings`) en Nederlands staat in `resources-dut/strings`. In het manifest staan de talen `dut` en `eng`. Beide talen zitten in de build (gecontroleerd in de `.prg`). De instelling heet in het Engels "Pairing code".
- **Webapp:** alle teksten staan in `public/lib/i18n.js` (nl/en). De taal volgt de browser (nl-* geeft Nederlands, de rest Engels), en er is een NL/EN-schakelaar rechtsboven. De keuze wordt bewaard in localStorage.
  - Statische teksten krijgen hun vertaling via `data-i18n*`-attributen, en meldingen via `t()`. Er wordt geen `innerHTML` gebruikt, dus de CSP blijft ongewijzigd.
  - Er is een Engelse privacypagina (`privacy-en.html`).
- **Tests:** 49 Worker-tests. Er is een test die controleert dat elke sleutel in beide talen bestaat, en een paginatest voor taaldetectie en de schakelaar.
- **Store-tekst:** de volledige Engelse beschrijving staat in `docs/store/beschrijving.md`.

**2026-11-13 (Claude):**
- De maintainer heeft de website en het horloge in beide talen goedgekeurd en de app geüpload als gewone app: https://apps.garmin.com/apps/421c9b52-f51b-4a20-9c93-7f7fe1f53b1e. De review duurt maximaal 30 dagen.
- De link staat op de privacypagina's (contact) en in `docs/store/beschrijving.md`.
- Nog te doen:
  - De maintainer installeert de publieke app (dat kan al tijdens de review) en vult de koppelcode in.
  - Daarna wordt de privé-opzet opgeruimd: `mac/`, `API_KEY`, KV en `workers_dev = false`, en de beta in de store en op het horloge.

**2026-11-13 (Claude), opgeruimd na de test door de maintainer** ("de nieuwe versie staat op mijn horloge en werkt goed"):
- **Mac-app verwijderd** (`mac/`). De logica leeft verder in `worker/public/lib/`. `lokaal.gpx` staat in de root, en de testroute van het horloge maak je nu met `cd worker && npm run watch-route`.
- **Worker:**
  - het pad voor de oude sleutel en de KV-overname zijn verwijderd;
  - `workers_dev = false` en `preview_urls = false`: `workers.dev` geeft 404, `deboskes.eu` werkt;
  - het secret `API_KEY` en de KV-namespace zijn verwijderd.
  - De overgezette privé-route in D1 verloopt vanzelf na 90 dagen.
- **Documentatie:** `CLAUDE.md`, `docs/route-format.md`, `docs/security.md`, `docs/knooppuntbestand.md` en `worker/README.md` zijn bijgewerkt.
- **Nog door de maintainer:**
  - de beta-app (`23a5602d…`) verwijderen uit de store en van het horloge;
  - eventueel de oude Mac-gegevens weghalen:
    - het sleutelhanger-item "Fietsknooppunten Worker";
    - `~/Library/Application Support/Fietsknooppunten`;
    - `~/Library/Caches/Fietsknooppunten/overpass`.
  - De OSM-extracten in `~/Library/Caches/Fietsknooppunten/osm` zijn nog nodig voor de wekelijkse taak.
- 14-11-2026: de store-review is positief; de app is publiek te vinden op https://apps.garmin.com/apps/421c9b52-f51b-4a20-9c93-7f7fe1f53b1e.
