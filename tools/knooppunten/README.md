# Knooppuntbestand bouwen

Maakt `knooppunten.json` (formaat: `docs/knooppuntbestand.md`) uit OpenStreetMap-extracten van Geofabrik.

Vereist: `brew install osmium-tool`, en `curl` en `python3`.

```sh
tools/knooppunten/build.sh <werkmap> <uitvoer.json> [regio ...]   # standaard: NL + BE
python3 -I -m unittest discover -s tools/knooppunten              # tests
```

## Wekelijks bijwerken op de Mac (launchd)

`update.sh` gaat als volgt te werk:
1. Hij bouwt het bestand in `~/Library/Caches/Fietsknooppunten/osm`. De extracten blijven daar staan; een nieuwe download gebeurt alleen als Geofabrik een nieuwere versie heeft.
2. Hij zet het resultaat in `worker/public/data/knooppunten.json`.
3. Hij rolt de Worker uit, maar alleen als de inhoud veranderd is en de repo schoon op `main` staat. Zo gaat werk in uitvoering nooit live. Staat de repo op een andere branch, dan draai je hem later met de hand opnieuw.

**Geïnstalleerd op 13-11-2026.** Opnieuw installeren (zondag 04:00; staat de Mac dan uit, dan draait launchd de taak bij de volgende start):

```sh
sed "s|REPO|$PWD|" tools/knooppunten/nl.deboskes.fietsknooppunten.knooppunten.plist \
  > ~/Library/LaunchAgents/nl.deboskes.fietsknooppunten.knooppunten.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/nl.deboskes.fietsknooppunten.knooppunten.plist
```

- **Log:** `/tmp/fietsknooppunten-knooppunten.log`.
- **Nu meteen draaien:** `launchctl kickstart gui/$(id -u)/nl.deboskes.fietsknooppunten.knooppunten`.
- **Verwijderen:** `launchctl bootout gui/$(id -u)/nl.deboskes.fietsknooppunten.knooppunten`.

**Ruimte:** de extracten van NL + BE zijn samen ongeveer 2,1 GB.

**Let op:** `worker/public/data/knooppunten.json` staat niet in git. Draai na een verse checkout eerst `update.sh` (of `build.sh`) voordat je `wrangler deploy` doet, anders ontbreekt het bestand op de site.
