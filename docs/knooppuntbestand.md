# Knooppuntbestand (v1)

Het statische bestand waarmee de webapp knooppunten, verbindingen en plaatsen opzoekt, zonder Overpass of Nominatim (zie `docs/research/publiek-kosten.md`). Het wordt gemaakt door `tools/knooppunten/build.sh` uit Geofabrik-extracten van Nederland en België.

```json
{"v":1,"date":"2026-11-13",
 "license":"ODbL 1.0, https://opendatacommons.org/licenses/odbl/",
 "attribution":"© OpenStreetMap-bijdragers, https://www.openstreetmap.org/copyright",
 "j":[[21,5165411,533312], …],
 "c":[[21,40,5165963,533988], …],
 "p":[["Rosmalen",5171866,536292], …]}
```

| Veld | Betekenis |
|---|---|
| `v` | Versie van dit formaat. |
| `date` | Datum waarop het bestand is gemaakt. |
| `license`, `attribution` | Verplicht volgens ODbL. De webapp toont de attributie. |
| `j` | Alle knooppunt-nodes: `[nummer, lat, lon]`. **Niet geclusterd.** In OSM staat één knooppunt vaak als meerdere nodes rond een kruising. De webapp clustert ze zelf binnen 200 m, met `clusters()` in `worker/public/lib/resolver.js`, zodat er maar één implementatie van de clusterregel is. |
| `c` | Fietsverbindingen (OSM-relaties `route=bicycle`, `network=rcn`, `ref=mm-nn`): `[laag nummer, hoog nummer, lat, lon]`. Het punt ligt op de verbinding (het midden van de middelste weg), want nummerparen komen landelijk vaak terug. Een verbinding a–b telt bij een stap als het punt dicht bij beide knooppunten ligt, bijvoorbeeld binnen hun onderlinge afstand plus 1 km. |
| `p` | Woonplaatsen (`place=city/town/village`) voor "omgeving": `[naam, lat, lon]`. Waar die bestaat, wordt `name:nl` gebruikt (Brussel in plaats van "Bruxelles - Brussel"). |

Coördinaten zijn graden × 100.000, net als in `docs/route-format.md`.

**Bron en bijwerken**
- **Bron:** de extracten van [Geofabrik](https://download.geofabrik.de/) (`europe/netherlands`, `europe/belgium`), gefilterd met `osmium tags-filter`.
- **Waarom geen Overpass:** een weekelijkse query op de openbare Overpass-server is "automated use". De server verwijst daarvoor zelf naar een eigen instantie, en een query voor heel NL+BE kwam bij een test niet door (502, "at capacity").
- **Bouwtijd:** het script downloadt alleen opnieuw als Geofabrik een nieuwer extract heeft (`curl -z`).

**Licentie:** het bestand is een afgeleide database van OpenStreetMap en valt dus onder de ODbL 1.0. Wie het bestand gebruikt, moet de attributie tonen. Het bestand zelf moet onder dezelfde licentie beschikbaar blijven, en de webapp publiceert het openbaar.

**Gemeten (13-11-2026, NL + BE):**

| | |
|---|---|
| Knooppunt-nodes (`j`) | 20.487 |
| Verbindingen (`c`) | 27.643 |
| Woonplaatsen (`p`) | 5.836 |
| Bestandsgrootte | 1,21 MB, gzip 458 KB, brotli 337 KB (Cloudflare levert brotli) |
| Bouwtijd inclusief download (2,1 GB) | 4,5 minuten; zonder nieuwe download ongeveer 1 minuut |

**Controle:** alle 22 knooppunten van `lokaal.gpx` liggen op maximaal 55 m van een node met hetzelfde nummer. De afstand komt van het clusterzwaartepunt in de GPX, binnen de samenvoegafstand van 200 m.
