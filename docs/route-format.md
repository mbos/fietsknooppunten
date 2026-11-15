# Routeformaat voor het horloge (v1)

Dit is het contract tussen de webapp en de horloge-app. De webapp maakt het met `encode` (in `worker/public/lib/route.js`), de Worker controleert het (`validate` in `worker/src/index.js`), en de horloge-app leest precies dit formaat (`watch/source/Route.mc`). Pas het hier en op alle drie de plekken tegelijk aan, en verhoog `v` bij een wijziging die oudere versies breekt.

```json
{"j":[[93,5171976,536379],[99,5171083,537598],[5]],"n":"lokaal","v":1}
```

| Veld | Type | Betekenis |
|---|---|---|
| `v` | Integer | Versie van het formaat, nu `1`. Het horloge weigert een onbekende versie. |
| `n` | String | Naam van de route. |
| `j` | Array | De stappen in rijvolgorde. |

**Een stap** is een array van integers:

- `[nummer, lat, lon]`: knooppuntnummer (1–99) met de positie.
- `[nummer]`: knooppuntnummer zonder bekende positie (handmatige invoer waarvan de coördinaten nog niet zijn opgezocht). Het horloge kan voor zo'n stap geen afstand tonen en ook niet automatisch doorschakelen.

`lat` en `lon` zijn WGS84-graden × 100.000, afgerond naar een integer (1 eenheid is ongeveer 1,1 m). Er worden integers gebruikt omdat `Float` in Monkey C maar 32 bit is. Op het horloge reken je terug met `lat / 100000.0d`.

**Regels**

- **Identiteit:** een stap wordt herkend aan zijn index in `j`, niet aan zijn nummer. In een rondrit staat hetzelfde nummer aan begin en eind (bv. 93).
- **Nummers:** die zijn al genormaliseerd ("05" wordt 5).
- **Grootte:** een route van 22 stappen is ongeveer 450 bytes.

- **Grootte met track:** `lokaal.gpx` (22 stappen, 181 trackpunten, 59 afslagen) is 2,7 KB.

## Optioneel: track en afslagen (ticket 08)

Alleen bij een route uit een GPX-import. Oudere horloge-apps negeren deze velden, dus `v` blijft `1`.

```json
{"b":[[1,1],[2,-1]],"j":[…],"n":"lokaal","t":[[5171976,536379],[-25,12],[3,40]],"v":1}
```

| Veld | Type | Betekenis |
|---|---|---|
| `t` | Array | Vereenvoudigde track (Douglas-Peucker, 10 m). Het eerste punt is `[lat, lon]` absoluut, de rest zijn de verschillen met het vorige punt, in dezelfde eenheden als bij de stappen. Minimaal 2 punten. |
| `b` | Array | Afslagen `[trackindex, richting]`. Richting: `-2` scherp links, `-1` links, `1` rechts, `2` scherp rechts. De index wijst naar het trackpunt waar de afslag begint (1 tot en met het aantal punten − 2). Zonder `t` mag `b` er niet zijn. |

**Afslagen bepalen** (`worker/public/lib/trackguide.js`):

- Per trackpunt wordt de koerswijziging bepaald.
- Wijzigingen op punten die minder dan 40 m uit elkaar liggen, worden opgeteld, bijvoorbeeld op een rotonde.
- Een netto wijziging onder de 45° is een bocht in de weg en geen afslag. Vanaf 120° is het een scherpe afslag.

**Testroute horloge:** `watch/resources/jsonData/route.json` is precies wat de webapp voor `lokaal.gpx` verstuurt; een test bewaakt dat. Na een wijziging aan het formaat maak je hem opnieuw met `cd worker && npm run watch-route`.
