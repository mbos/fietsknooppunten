# 01: Knooppuntbestand voor NL en BE (statisch, wekelijks bijgewerkt)

**What to build:** Een script dat alle fietsknooppunten van Nederland en België uit OpenStreetMap haalt en als één compact statisch JSON-bestand wegschrijft. Per knooppunt: nummer en positie. Daarnaast de verbindingen (`ref=mm-nn`) en een lijst woonplaatsen met hun positie, zodat de webapp zonder Overpass en Nominatim werkt. Een geplande taak, bijvoorbeeld een gratis GitHub Action, draait het script wekelijks. Zie `docs/research/publiek-kosten.md`.

**Blocked by:** None

**Status:** done

- [x] **Bron gekozen en onderbouwd:** Geofabrik-extract met osmium, of één Overpass-query per week op een rustig moment (dat valt binnen het beleid).
- [x] **Grootte gemeten**, ruw en gecomprimeerd (een open punt uit het onderzoek). Doel: onder 1 MB gecomprimeerd.
- [x] **Formaat vastgelegd** in `docs/`, inclusief een versieveld en een datum.
- [x] **ODbL:** attributie en licentie staan in het bestand en in de documentatie.
- [x] **Wekelijkse taak** draait (de maintainer koos launchd op de Mac in plaats van GitHub Actions; de taak is klaar, en wordt geïnstalleerd bij ticket 04), en het bestand komt terecht waar de webapp het kan laden (static assets).
- [x] **Clustering:** nodes met hetzelfde nummer binnen 200 m worden samengevoegd, of het bestand houdt alle nodes. Kies en motiveer, in lijn met `JunctionCluster` in RouteKit.

## Comments

**2026-11-13 (Claude):**
- **Bron: de Geofabrik-extracten, gefilterd met osmium** (`tools/knooppunten/build.sh` en `build.py`). Overpass viel af: de openbare server weigerde de NL+BE-query ("at capacity"), en verwijst bij geautomatiseerd gebruik naar een eigen instantie.
- **Gemeten:**
  - 20.487 nodes, 27.643 verbindingen, 5.836 plaatsen.
  - 1,21 MB, gzip 458 KB, brotli 337 KB.
  - Bouwen duurt 4,5 minuten, inclusief 2,1 GB downloaden.
- **Formaat:** `docs/knooppuntbestand.md`.
  - Nodes zijn niet geclusterd: dat doet de webapp, met dezelfde regel als RouteKit.
  - Verbindingen hebben een punt op de route, omdat nummerparen landelijk vaak terugkomen.
- **Tests:** 4 unit tests (`python3 -I -m unittest discover -s tools/knooppunten`).
- **Controle:** de 22 knooppunten van `lokaal.gpx` liggen allemaal binnen 55 m van een node met hetzelfde nummer.
- **Bijwerken:** de maintainer koos launchd op de Mac. Daarvoor zijn er `update.sh` en een plist, met installatie-instructies in `tools/knooppunten/README.md`.
  - Het script bouwt, kopieert naar `worker/public/data/` (in .gitignore) en rolt uit als er iets veranderd is.
  - De taak wordt pas geïnstalleerd zodra de Worker static assets heeft (ticket 04).

**2026-11-13 (Claude):** De launchd-taak is geïnstalleerd (zondag 04:00). Het bestand staat live op https://fietsknooppunten.deboskes.eu/data/knooppunten.json.
