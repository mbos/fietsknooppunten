# 05: Webapp: GPX importeren, met track en afslagen

**What to build:** Een GPX importeren in de webapp, zoals de Mac-app dat doet:
- waypoints "Knooppunt NN" worden stappen, en waypoints met hetzelfde nummer binnen 200 m worden samengevoegd;
- de naam komt uit de GPX;
- de track wordt vereenvoudigd (Douglas-Peucker, 10 m), en daaruit volgen de afslagen (`TrackGuide`: 45° en samenvoegen binnen 40 m).

Het resultaat moet byte-voor-byte gelijk zijn aan wat de Mac-app voor dezelfde GPX verstuurt.

De GPX komt in de praktijk uit de ANWB Fietsknooppuntenplanner (besluit: geen eigen kaart). Test daarom met een echte ANWB-export, zoals `lokaal.gpx`.

**Blocked by:** 04

**Status:** done

- [x] Test: `lokaal.gpx` geeft precies `watch/resources/jsonData/route.json`
- [x] De testgevallen van `GPXImporterTests` en `TrackGuideTests` zijn overgezet
- [x] Een GPX zonder knooppunten geeft een duidelijke melding

## Comments

**2026-11-13 (Claude):**
- **Overgezet naar `worker/public/lib/`:**
  - `xml.js`: een kleine, strikte XML-lezer die ook in Node werkt, zonder DOMParser;
  - `gpx.js`: GPXImporter;
  - `geo.js`: haversine, centroid en peiling, met dezelfde volgorde van rekenen als Swift;
  - `trackguide.js`: Douglas-Peucker en de afslagen;
  - `route.encode`: zet `t` en `b` er nu zelf bij als er een track is.
- **Byte-gelijk:** `encode(importGpx(lokaal.gpx))` is precies `watch/resources/jsonData/route.json`, en daarmee precies wat de Mac-app verstuurt. Er waren geen afrondingsverschillen tussen de wiskundefuncties van V8 en Darwin.
- **Tests:** 12 nieuwe, overgenomen uit `GPXImporterTests` en `TrackGuideTests`, plus de XML-lezer (namespaces, CDATA, entiteiten). In totaal zijn er 34 Worker-tests.
- **Pagina:**
  - De knop "GPX importeren" maakt een nieuwe route en selecteert die.
  - Een fout verschijnt in het Nederlands boven de lijst.
  - Bij een route met track staat uitleg over de afslagen.
- **Uitgerold:** https://fietsknooppunten.deboskes.eu.

**2026-11-13 (Claude):** De maintainer heeft de hele keten getest en die werkt: de code uit de webapp in de horloge-instelling, `lokaal.gpx` importeren, versturen en op het horloge ophalen.
