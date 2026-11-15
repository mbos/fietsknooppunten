# 06: Webapp: locaties opzoeken in het knooppuntbestand

**What to build:** Bij een handmatig ingevoerde route zoekt de webapp de locaties op in het statische knooppuntbestand (ticket 01). Er worden geen Overpass- of Nominatim-verzoeken gedaan. Daarvoor zet je de logica van de Mac-app over:
- de gebruiker kiest een omgeving uit de lijst woonplaatsen in het bestand;
- kandidaten worden gezocht binnen 40 km, en geclusterd;
- bij dubbele nummers kiest Viterbi de kortste route;
- als er geen verbinding bestaat (volgens de verbindingen in het bestand), krijgt de gebruiker een waarschuwing.

**Blocked by:** 01, 04

**Status:** done

- [x] De testgevallen van `JunctionResolverTests` zijn overgezet en slagen
- [x] Werkt offline nadat het bestand één keer geladen is (cache)
- [x] De woonplaats zoeken werkt in de lijst, zonder Nominatim
- [x] Laden en zoeken voelt snel op een telefoon. Meet de laadtijd van het bestand. (Gemeten: 337 KB over de lijn (brotli), JSON parsen ~4 ms op de Mac. Op de telefoon nog door de maintainer te beoordelen.)

## Comments

**2026-11-13 (Claude):**
- **`worker/public/lib/resolver.js`:** zet `JunctionCluster` en `JunctionResolver` over, met dezelfde volgorde en dezelfde Viterbi.
  - **Verbindingscontrole:** het punt van de verbinding moet binnen (afstand a–b + 1 km) van beide knooppunten liggen, omdat nummerparen landelijk vaak terugkomen.
  - **Woonplaatsen zoeken:** hoofdletters en accenten tellen niet mee. Bij een dubbele naam staat de dichtstbijzijnde andere plaats erbij ("Oosterhout, bij Breda").
- **`junctions.js`:** het bestand wordt één keer geladen en bewaard in de Cache API, dus het werkt ook offline. Is het ouder dan 7 dagen, dan wordt het op de achtergrond ververst.
- **Tests:** 9 nieuwe (in totaal 43), waaronder één met het echte bestand. De 22 nummers van `lokaal.gpx` met als omgeving "Rosmalen" komen allemaal binnen 100 m van de GPX-posities uit. De ontbrekende verbindingen zijn 59→51 en 51→3, dezelfde als bij de live Overpass-test op de Mac.
- **Pagina:**
  - Zolang er stappen zonder locatie zijn, staat er een opzoekblok met de omgeving en een suggestielijst (bediening met pijltjes, Enter en Esc).
  - Na het opzoeken volgt een samenvatting, en ⚠ bij ontbrekende verbindingen. Dat is een waarschuwing, geen blokkade.
- **Knooppuntbestand:** live op `/data/knooppunten.json` (1,2 MB, brotli 337 KB).
- **launchd-taak (ticket 01):** nu geïnstalleerd, voor elke zondag om 04:00. De extracten staan in `~/Library/Caches/Fietsknooppunten/osm`.
  - `update.sh` rolt alleen uit vanaf een schone `main`, anders zou werk in uitvoering live gaan.
- **Bugfix na de eerste test door de maintainer:** "Ik zie geen knop zoek locaties". `missing` werd gebruikt voordat het met `const` was gedeclareerd (TDZ), waardoor `renderEditor` afbrak. De oplossing is een paginatest in jsdom (`test/web/page.test.js`), die de echte `index.html` en `app.js` draait en met de oude code faalt.

**2026-11-13 (Claude):** De maintainer bevestigt dat het werkt.
