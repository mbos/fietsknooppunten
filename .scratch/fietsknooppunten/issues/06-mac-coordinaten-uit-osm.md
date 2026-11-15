# 06: Mac – coördinaten opzoeken bij handmatige invoer

**What to build:** Bij een handmatig ingevoerde route zoekt de Mac-app de coördinaten van elk knooppunt op in OpenStreetMap via de Overpass API (fietsknooppuntnetwerk, `rcn_ref`). Omdat nummers niet uniek zijn (bv. twee keer 21, 4,1 km uit elkaar), kiest de app het kandidaat-knooppunt dat het dichtst bij het vorige ligt; de gebruiker kan het eerste knooppunt op een kaart of via een plaatsnaam vastzetten. De app waarschuwt (zonder te blokkeren) als twee opeenvolgende knooppunten volgens OSM niet verbonden zijn. Zie `docs/research/technologie.md` secties F en H.

**Blocked by:** 02

**Status:** done (eis "niet versturen zonder coördinaten" verhuist naar ticket 04)

- [x] Handmatig ingevoerde route krijgt coördinaten voor elke stap
- [x] Dubbelzinnige nummers worden opgelost via nabijheid; de gebruiker kan corrigeren
- [x] Waarschuwing bij ontbrekende verbinding, route blijft bruikbaar
- [ ] Een route zonder volledige coördinaten kan niet verstuurd worden (of alleen met duidelijke waarschuwing)
- [x] OSM-attributie ("© OpenStreetMap-bijdragers", ODbL) zichtbaar in de app
- [x] Netjes omgaan met Overpass-fouten/timeouts; resultaten gecached

## Comments

**2026-11-13 (Claude):**
- **Omgeving:** de plaats zoeken we op via Nominatim, niet via Overpass. Een plaats-query over heel NL/BE duurde op Overpass 37 s of meer, of liep vast op de tijdslimiet. Nominatim deed er 0,6 s over.
- **Knooppunten ophalen:** één Overpass-query voor alle nummers van de route binnen 40 km. Nodes van hetzelfde knooppunt binnen 200 m worden samengevoegd.
- **Kiezen bij dubbele nummers:** Viterbi bepaalt de kortste totale route vanaf de plaats. Dat is robuuster dan steeds de dichtstbijzijnde kiezen. Stappen die al een locatie hebben (uit een GPX) liggen vast.
- **Verbindingen:** gecontroleerd op nummer (`ref=mm-nn`). Een ontbrekende verbinding geeft een oranje waarschuwing bij die stap.
- **Robuustheid:**
  - Bij 429/502/503/504 of een "runtime error" in het antwoord probeert de app een volgende Overpass-server; bij overpass-api.de kwamen tijdens de bouw 502's voor.
  - Antwoorden worden 7 dagen bewaard in `~/Library/Caches/Fietsknooppunten/overpass`.
  - Het zoeken is af te breken.
- **Tests:** 43 unit tests. Daarnaast een live test (`FKP_LIVE=1 swift test --filter OverpassLiveTests`): de handmatig ingevoerde `lokaal`-route rond "Rosmalen" geeft alle 22 knooppunten, elk binnen 100 m van de GPX. De verbindingscontrole meldt precies 59→51 en 51→3, net als in het onderzoek. De test duurt ongeveer 65 s door drukke servers.
- **Nog open:** de eis "route niet versturen zonder volledige coördinaten" kan pas in ticket 04. Tot dan toont de editor hoeveel knooppunten nog geen locatie hebben.

**2026-11-13 (Claude):**
- **Verbindingscontrole losgekoppeld:** de controle duurde 41 s of langer en liet het venster hangen. De locaties komen nu meteen in de route; de controle loopt daarna, met hooguit 150 s voor alle servers samen.
- **Getest:** de gebruiker heeft het in de app gecontroleerd en het werkt.
