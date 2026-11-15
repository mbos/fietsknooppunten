# 04: Route versturen van Mac naar horloge

**What to build:** In de Mac-app zit een knop "Verstuur naar horloge". Die zet de route als JSON op een eigen Cloudflare Worker (met geheime sleutel). De watch-app haalt bij het starten (en op verzoek via het menu) de route op met `makeWebRequest` via de telefoon, bewaart hem in `Application.Storage` en gebruikt hem daarna ook zonder verbinding. Adres en sleutel van de Worker stelt de gebruiker éénmalig in via de app-instellingen in Garmin Connect; daarvoor wordt de app als Beta App via de Connect IQ Store geïnstalleerd. Dit vervangt het plakken van een routecode. Zie `docs/research/technologie.md` sectie D en H.

**Blocked by:** 01, 02

**Status:** done (maximale responsegrootte nog open, pas relevant bij ticket 08)

- [x] Cloudflare Worker met endpoints om de route te schrijven (Mac, met sleutel) en te lezen (horloge, met sleutel), antwoord als `application/json`
- [x] Mac-app: Worker-adres en sleutel instelbaar; "Verstuur" geeft duidelijke bevestiging of foutmelding
- [x] Watch-app: route ophalen bij start en via menu; laatst ontvangen route blijft beschikbaar zonder telefoon/internet
- [x] "Verstuur" is niet mogelijk (of alleen na een duidelijke waarschuwing) zolang niet alle knooppunten een locatie hebben (uit ticket 06)
- [x] Horloge toont "geen verbinding" / "geen route" netjes i.p.v. te crashen
- [ ] Maximale responsegrootte van `makeWebRequest` gecontroleerd met een route mét track-ruimte (~3 KB) (open vraag 7)
- [x] Werkt als Beta App op het echte horloge: route op Mac wijzigen → versturen → horloge toont nieuwe route
- [x] Privacy: routes zijn niet zonder sleutel op te vragen (open vraag 8)

## Comments

**2026-11-13 (Claude):**
- **Worker (`worker/src/index.js`):**
  - `PUT /route` en `GET /route`, allebei met `Authorization: Bearer <API_KEY>`. De sleutel wordt in constante tijd vergeleken, via SHA-256.
  - Eén route in KV. Het formaat wordt gecontroleerd, met maximaal 16 KB.
  - 6 Node-tests met een nep-KV.
  - Hoe je hem instelt staat in `worker/README.md`.
- **Mac:**
  - Instellingen (⌘,) voor het serveradres en de sleutel. De sleutel staat in de sleutelhanger.
  - De knop "Verstuur naar horloge" werkt pas als alle knooppunten een locatie hebben. Daarna volgt een bevestiging of een foutmelding in het Nederlands.
  - `RouteUploader` in RouteKit, met 5 tests.
- **Horloge:**
  - De instellingen `workerUrl` (type url) en `apiKey` (type password) vul je in via Garmin Connect. Daarvoor is de permissie `Communications` toegevoegd.
  - De app haalt de route op bij het starten, bij `onSettingsChanged` en via het menu-item "Route ophalen".
  - De laatste route staat in `Application.Storage`. Is die gelijk aan de nieuwe, dan blijft de stap waar je bent behouden. Een nieuwe route begint bij stap 1.
  - Je ziet ongeveer 8 s een melding: "nieuwe route", "geen verbinding", "sleutel klopt niet", "nog geen route verstuurd", "stel de server in" of "ophalen mislukt".
  - Zonder route verschijnt het scherm "geen route". In een debug-build (simulator) valt de app terug op de testroute, in de store-versie niet.
  - 21 unit tests.
- **Nog open:**
  - De Worker uitrollen. Dat vraagt `wrangler login` door de gebruiker.
  - De volledige keten testen op het horloge.
  - Open vraag 7: de maximale responsegrootte. De huidige route is ongeveer 0,5 KB, dus pas relevant bij ticket 08.

**2026-11-13 (Claude), na de eerste test door de gebruiker:**
- **Serveradres:** Garmin Connect accepteerde het adres niet in een setting van het type `url`. Het adres zit nu vast in beide apps, dus de enige instelling is de sleutel.
- **Besluit van de gebruiker:** de app blijft privé (alleen beta, één gebruiker, één sleutel). Een versie voor meer gebruikers met een eigen koppelcode per gebruiker is besproken en voor nu afgewezen.
- **Mac:** het instellingenvenster heeft een knop "Klaar".

**2026-11-13 (Claude):** De gebruiker heeft de keten op het echte horloge getest: route versturen vanaf de Mac, en het horloge toont de nieuwe route. De sleutel-instelling (type password) werkt in Garmin Connect.
