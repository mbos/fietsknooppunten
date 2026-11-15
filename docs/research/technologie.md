# Technologie-onderzoek: fietsknooppunten (macOS + Garmin Forerunner 970)

Onderzoeksdatum: 2026-11-12. Bronnen zijn primaire bronnen (Garmin developer docs en handleiding, Apple developer docs, OSM-wiki, openstreetmap.org). Alles wat niet uit een primaire bron te verifiëren was, staat gemarkeerd als **niet geverifieerd**. Metingen op `lokaal.gpx` en de live Overpass-queries zijn door mij zelf uitgevoerd op 2026-11-12. De tekst noemt ze steeds "eigen meting".

---

## Samenvatting en aanbeveling

- **Haalbaar.** De Forerunner 970 ondersteunt Connect IQ: device id `fr970`, API level 6.0, rond AMOLED-scherm van 454×454, touchscreen, knoppen `enter, up, menu, down, esc`, geheugenlimiet voor een watch-app van 786.432 bytes ([device reference](https://developer.garmin.com/connect-iq/device-reference/fr970/), [compatible devices](https://developer.garmin.com/connect-iq/compatible-devices/)).
- **App-type: watch-app (device app)** die zelf een fietsactiviteit opneemt via `ActivityRecording.createSession` met `Activity.SPORT_CYCLING`. Een data field kan geen knoppen ontvangen ("data fields can only know if they have been tapped", [Input Handling](https://developer.garmin.com/connect-iq/core-topics/input-handling/)). Widgets mogen geen activiteiten opnemen ([App Types](https://developer.garmin.com/connect-iq/connect-iq-basics/app-types/)).
- **Bediening.** Het juiste volgende knooppunt wordt automatisch bepaald via GPS: arriveren binnen een straal met hysterese, met de routevolgorde als leidraad. UP/DOWN/START dienen als handmatige override via `onKey` (`KEY_UP`/`KEY_DOWN`/`KEY_ENTER`).
- **Routeformaat.** Een geordende lijst routestappen met nummer en lat/lon, inclusief herhalingen zoals 93 aan begin en eind. Voor `lokaal.gpx` is dat 22 stappen, ongeveer 435 tekens als compacte string (eigen meting). Een vereenvoudigde track (Douglas-Peucker, 10 m) is 181 punten, ongeveer 1,4 KB delta-gecodeerd of 2,3 KB als totale JSON. Ruim binnen het watch-geheugen en de `Storage`-limiet van 32 KB per waarde ([Persisting Data](https://developer.garmin.com/connect-iq/core-topics/persisting-data/)).
- **Transport Mac → horloge:**
  - **v1:** de Mac-app genereert een compacte routecode die de gebruiker plakt in de app-instellingen (Garmin Connect-app/Garmin Express). Daarvoor moet de app als **Beta App** via de Connect IQ Store geïnstalleerd zijn, en dat lost meteen het USB/MTP-probleem op macOS op ([Beta Apps](https://developer.garmin.com/connect-iq/core-topics/beta-apps/)).
  - **v2:** de Mac-app publiceert JSON (knooppunten plus vereenvoudigde track) naar een HTTPS-URL, en het horloge haalt die op met `Communications.makeWebRequest` via de telefoon. Optioneel daarnaast een GPX-course-export voor native Garmin-navigatie.
- **Mac-app:** SwiftUI. SwiftData vereist macOS 14 ([SwiftData](https://developer.apple.com/documentation/swiftdata)). Voor de huidige Xcode 27.2 is macOS Tahoe 26.6 of later nodig ([Xcode system requirements](https://developer.apple.com/xcode/system-requirements/)); deze Mac draait 26.6.2 (eigen meting). Invoer kan handmatig (nummers, coördinaten via Overpass) of via GPX-import.
- **Belangrijke datavondst (eigen meting).** De ANWB-waypoints in `lokaal.gpx` liggen exact (0 m) op OSM-knooppuntnodes. Eén fysiek knooppunt is in OSM vaak als meerdere nodes gemapt (84: 6 nodes binnen 63 m; 82: 2 nodes 109 m uit elkaar). Nummers komen in dezelfde regio meerdere keren voor (21: twee keer, 4,1 km uit elkaar). Het samenvoegen moet dus op "zelfde nummer en dichtbij" gebeuren, en handmatige invoer moet disambiguatie doen via aangrenzende knooppunten.

---

## A. Connect IQ SDK en Monkey C-toolchain op macOS

- **Huidige SDK:** Connect IQ **9.3.0**, pagina bijgewerkt op 30 oktober 2026 ([SDK](https://developer.garmin.com/connect-iq/sdk/)).
- **SDK Manager:** downloaden via de SDK-pagina, op de Mac de app uit de disk image kopiëren en inloggen met een Garmin Connect-account. Daarna SDK en device-bestanden (waaronder `fr970`) downloaden en "Use as SDK" kiezen ([Getting Started](https://developer.garmin.com/connect-iq/connect-iq-basics/getting-started/)).
- **VS Code-extensie "Monkey C" (Garmin):** vereist VS Code, **Oracle Java Runtime 11 of hoger** en SDK 4.0.6 of hoger. Controleren met `Monkey C: Verify Installation` ([VS Code Extension](https://developer.garmin.com/connect-iq/reference-guides/visual-studio-code-extension/)). Op deze Mac staat VS Code, maar er is **geen Java Runtime** gevonden (eigen meting): die moet nog geïnstalleerd worden.
- **Developer key:** een RSA-4096 private key, aan te maken via `Monkey C: Generate a Developer Key`. Gebruik altijd dezelfde key: "If you lose your original signing key you will not be able to update your app" ([Getting Started](https://developer.garmin.com/connect-iq/connect-iq-basics/getting-started/)).
- **Simulator:** start via Run in VS Code of met `connectiq`. Uitvoeren met `monkeydo app.prg fr970`, compileren met `monkeyc -d fr970 -f monkey.jungle -o app.prg -y key.der`. Daarvoor moet `PATH` wijzen naar de `bin` van `~/Library/Application Support/Garmin/ConnectIQ/current-sdk.cfg` ([CLI setup](https://developer.garmin.com/connect-iq/reference-guides/monkey-c-command-line-setup/)). Een workout simuleer je met *Simulation > FIT Data > Playback File…* ([App Types](https://developer.garmin.com/connect-iq/connect-iq-basics/app-types/)). Dat is nuttig om automatisch doorschakelen te testen met een echte rit.
- **Projectstructuur** (`Monkey C: New Project`): `bin/`, `resources/` (layouts, strings, drawables, properties en settings), `source/` (`.mc`) en `manifest.xml` ([Your First App](https://developer.garmin.com/connect-iq/connect-iq-basics/your-first-app/)).
  - **`manifest.xml`:** bevat een UUID als app-id, `type` (`watch-app`, `datafield`, `widget`, `watchface` of `audio-content-provider-app`), `minApiLevel`, `<iq:products>` en de permissies ([Manifest and Permissions](https://developer.garmin.com/connect-iq/core-topics/manifest-and-permissions/)). Nodig zijn de permissies `Fit` (ActivityRecording), `Positioning` en `Communications`.
  - **`monkey.jungle`:** de buildtaal. Hierin staan `project.manifest` en per device-qualifier `sourcePath`, `resourcePath`, `excludeAnnotations`, `barrelPath`, `lang` en `personality` ([Jungle Reference](https://developer.garmin.com/connect-iq/reference-guides/jungle-reference/)).
  - **Resources:** `<jsonData id=… filename="route.json"/>` slaat (ingebakken) data op die "loaded on demand at runtime" wordt ([Resources](https://developer.garmin.com/connect-iq/core-topics/resources/)). Dat is handig voor testroutes.

## B. Forerunner 970 in Connect IQ

Bron, tenzij anders vermeld: [device reference fr970](https://developer.garmin.com/connect-iq/device-reference/fr970/).

| Eigenschap | Waarde |
|---|---|
| Device id | `fr970` (part number 006-B4565-00) |
| API level | 6.0 ([compatible devices](https://developer.garmin.com/connect-iq/compatible-devices/)) |
| Scherm | rond, 454×454, 65.536 kleuren, AMOLED ([compatible devices](https://developer.garmin.com/connect-iq/compatible-devices/)) |
| Touch | True |
| Knoppen | `enter, up, menu, down, esc` |
| Geheugen | Watch App 786.432 · Widget 786.432 · Data Field 131.072 · Glance 65.536 · Background 65.536 · Watch Face 131.072 (bytes) |
| Taal | o.a. `dut` |

**Fysieke knoppen** (volgens de [handleiding](https://www8.garmin.com/manuals/webhelp/GUID-025D75CF-3445-49E1-8D81-1AA74AB4E00F/EN-US/GUID-E9B8D548-6B6D-4050-8F3B-145B48B3CFF5.html)):

- **Linksboven:** licht en bedieningsmenu.
- **Linksmidden:** scrollen; ingedrukt houden opent het hoofdmenu.
- **Linksonder:** scrollen.
- **Rechtsboven:** "start or stop an activity" en optie kiezen.
- **Rechtsonder:** terug, of tijdens een activiteit "record a lap".

**Toewijzing aan Connect IQ:**

- `BehaviorDelegate.onNextPage()` wordt "typically triggered by the down button (`KEY_DOWN`) or by a `SWIPE_UP`".
- `onPreviousPage()` wordt getriggerd door `KEY_UP` of `SWIPE_DOWN`.
- `onSelect()` wordt getriggerd door `KEY_ENTER` of `CLICK_TYPE_TAP`.
- `onBack()` wordt getriggerd door `KEY_ESC`.

Bron: [BehaviorDelegate](https://developer.garmin.com/connect-iq/api-docs/Toybox/WatchUi/BehaviorDelegate.html). Low-level: `InputDelegate.onKey(KeyEvent)`, plus `onKeyPressed` en `onKeyReleased` (API 1.1.2) ([InputDelegate](https://developer.garmin.com/connect-iq/api-docs/Toybox/WatchUi/InputDelegate.html)). De koppeling tussen de fysieke knoppen linksmidden/linksonder/rechtsboven/rechtsonder en `KEY_UP`/`KEY_DOWN`/`KEY_ENTER`/`KEY_ESC` is **niet geverifieerd** voor de fr970 specifiek. Controleer dit in de simulator met `System.println(keyEvent.getKey())`.

**Kan het touchscreen storen? Ja.**

- Een tap leidt tot `onSelect`, wat het knooppunt zou verhogen, en een swipe leidt tot vorige/volgende pagina.
- Maatregel: gebruik `onKey` voor `KEY_UP`/`KEY_DOWN`/`KEY_ENTER` en laat `onTap`/`onSwipe` `true` retourneren, zodat touch-events worden opgeslokt. Maak de touch-gedreven behaviors (`onSelect`/`onNextPage`/`onPreviousPage`) zelf niet actief.
- In welke volgorde behavior- en key-events binnenkomen (behavior eerst, daarna de bijbehorende InputDelegate-functie, alleen als de behavior `false` retourneert, zie [BehaviorDelegate](https://developer.garmin.com/connect-iq/api-docs/Toybox/WatchUi/BehaviorDelegate.html)) moet je in de simulator testen.
- De gebruiker kan touch ook uitschakelen: via het bedieningsmenu, via *Display & Brightness > Touch*, of per activiteitsprofiel ([handleiding: touchscreen](https://www8.garmin.com/manuals/webhelp/GUID-025D75CF-3445-49E1-8D81-1AA74AB4E00F/EN-US/GUID-C8435F75-31AA-497C-88E8-2944AA182AEA.html), [Activity Settings](https://www8.garmin.com/manuals/webhelp/GUID-025D75CF-3445-49E1-8D81-1AA74AB4E00F/EN-US/GUID-3BFA3493-11F9-4CCC-8394-6440CE6A93D7.html)). Of die systeeminstelling ook voor Connect IQ-apps geldt, is **niet geverifieerd**.

**AMOLED / always-on:**

- De burn-in-regels (maximaal 10% van de pixels aan, geen pixel langer dan 3 minuten aan) gelden officieel alleen voor watch faces in sleep-modus ([AMOLED FAQ](https://developer.garmin.com/connect-iq/connect-iq-faq/how-do-i-make-a-watch-face-for-amoled-products/)).
- Advies voor schermen met continu bijgewerkte data: "the blacker the better" (zelfde bron). Ontwerp daarom met witte cijfers op een zwarte achtergrond.
- Of en wanneer het scherm van een watch-app tijdens een opname dimt of uitgaat (time-out of gebaren), is **niet geverifieerd**. Testen op het echte horloge.

**BACK/LAP:** tijdens een native activiteit is rechtsonder de lap-knop. In de eigen app komt dat binnen als `onBack`/`KEY_ESC`. Vang dit af, anders sluit de app. Je kunt het gebruiken voor `Session.addLap()` of voor een stop/opslaan-menu ([Session](https://developer.garmin.com/connect-iq/api-docs/Toybox/ActivityRecording/Session.html)).

## C. App-type: vergelijking en keuze

| | Watch-app (device app) | Data field | Widget/Glance |
|---|---|---|---|
| Knoppen | volledig | alleen tap ([Input Handling](https://developer.garmin.com/connect-iq/core-topics/input-handling/)) | beperkt; base view krijgt geen up/down ([App Types](https://developer.garmin.com/connect-iq/connect-iq-basics/app-types/)); glance krijgt geen input |
| Activiteit opnemen | ja, `ActivityRecording` alleen voor Watch App ([App Types](https://developer.garmin.com/connect-iq/connect-iq-basics/app-types/), [ActivityRecording](https://developer.garmin.com/connect-iq/api-docs/Toybox/ActivityRecording.html)) | nee, draait binnen een native activiteit | nee: "not allowed to record activities" |
| GPS | `Position.enableLocationEvents` ("Only Device Apps and Widgets", [Position](https://developer.garmin.com/connect-iq/api-docs/Toybox/Position.html)) | via `Activity.Info.currentLocation` in `compute()` ([Activity.Info](https://developer.garmin.com/connect-iq/api-docs/Toybox/Activity/Info.html)) | widget ja, maar time-out |
| Geheugen fr970 | 768 KB | 128 KB | 768 KB / 64 KB |
| Communications | ja | ja, sinds API 5.0.0 ([App Types](https://developer.garmin.com/connect-iq/connect-iq-basics/app-types/)) | ja |

**Opname in de eigen app:** dit kan via `ActivityRecording.createSession({:name=>"Knooppuntenrit", :sport=>Activity.SPORT_CYCLING, :subSport=>Activity.SUB_SPORT_ROAD})` en daarna `start()`, `stop()` en `save()` of `discard()`. Vereist de permissie `Fit`. De FIT-file synchroniseert naar Garmin Connect ([ActivityRecording](https://developer.garmin.com/connect-iq/api-docs/Toybox/ActivityRecording.html), [Activity Recording](https://developer.garmin.com/connect-iq/core-topics/activity-recording/)). Let op: de `ActivityRecording.SPORT_*`-enum is deprecated, gebruik daarom `Activity.SPORT_*` (zelfde bron).

**Aanbeveling: watch-app.** Alleen dit type combineert knoppen, eigen GPS en eigen opname.

**Alternatief voor later:** een data field binnen het native fietsprofiel. Dat geeft volledige native opname, sensoren en kaart, schakelt automatisch door op GPS (zie H) en is alleen via tap te overrulen. Bij native course-navigatie biedt `Activity.Info.nameOfNextPoint` en `distanceToNextPoint` bovendien de naam van het volgende coursepunt, en beide worden door de fr970 ondersteund ([Activity.Info](https://developer.garmin.com/connect-iq/api-docs/Toybox/Activity/Info.html)). Dat voldoet niet aan de eis "UP/DOWN schakelt", dus het blijft een v2- of v3-optie.

## D. Route van Mac naar horloge

| # | Optie | Voordelen | Nadelen |
|---|---|---|---|
| 1 | **App-settings** (`properties.xml` + `settings.xml`, type `alphaNumeric`, string) die de gebruiker invult in de Garmin Connect-app of Garmin Express. `AppBase.onSettingsChanged()` wordt aangeroepen bij een wijziging ([Properties and Settings](https://developer.garmin.com/connect-iq/core-topics/properties-and-app-settings/)) | geen server, geen eigen telefoon-app | Plakken op de telefoon is handwerk. **Maximale stringlengte niet geverifieerd** (er bestaat alleen een optionele `maxLength`). Settings werken in Garmin Connect voor store- en beta-apps ([Beta Apps](https://developer.garmin.com/connect-iq/core-topics/beta-apps/)). Of ze ook werken voor apps die via USB zijn gesideload, is **niet geverifieerd** (de beta-pagina suggereert van niet). Array-settings (`maxLength`, een lijst objecten) zijn een gestructureerd alternatief |
| 2 | **`Communications.makeWebRequest`** naar een HTTPS-JSON ([HTTPS](https://developer.garmin.com/connect-iq/core-topics/https/), [Communications](https://developer.garmin.com/connect-iq/api-docs/Toybox/Communications.html)) | automatisch; geschikt voor grotere payloads (track); resultaat cachen in `Application.Storage` | Vereist een verbinding met de telefoon (Garmin Connect Mobile als proxy) of Wi-Fi ("can be used when connected to WiFi or a mobile device over Bluetooth"; de fr970 heeft Wi-Fi volgens de [handleiding](https://www8.garmin.com/manuals/webhelp/GUID-025D75CF-3445-49E1-8D81-1AA74AB4E00F/EN-US/GUID-A320BB2B-B192-4CDF-931E-52FC01144D1E.html)). Response moet `application/json` zijn. Foutcodes o.a. `SECURE_CONNECTION_REQUIRED` (−1001), `NETWORK_RESPONSE_TOO_LARGE` (−402) en `BLE_CONNECTION_UNAVAILABLE` (−104). Maximale responsegrootte **niet geverifieerd**. BLE haalt "generally between 400 and 800 bytes/s" ([REST FAQ](https://developer.garmin.com/connect-iq/connect-iq-faq/how-do-i-use-rest-services/)), dus 2,3 KB duurt ongeveer 3 tot 6 s. Er is een host nodig |
| 3 | **Eigen telefoon-companion** (Mobile SDK iOS, mailbox-model) ([Communicating with Mobile Apps](https://developer.garmin.com/connect-iq/core-topics/communicating-with-mobile-apps/), [Mobile SDK iOS](https://developer.garmin.com/connect-iq/core-topics/mobile-sdk-for-ios/)) | geen publieke URL; sync bijvoorbeeld via iCloud tussen Mac en iPhone | Een derde app (iOS) met URL-scheme-koppeling met Garmin Connect Mobile; veel extra werk |
| 4 | **USB-sideload** | Een PRG naar `GARMIN/APPS` kopiëren ([Your First App](https://developer.garmin.com/connect-iq/connect-iq-basics/your-first-app/)). De route kan als `jsonData`-resource in de build worden ingebakken; de Mac-app kan zelf `monkeyc` aanroepen | De fr970 heeft "USB Mode: MTP of Garmin mode" ([Advanced System Settings](https://www8.garmin.com/manuals/webhelp/GUID-025D75CF-3445-49E1-8D81-1AA74AB4E00F/EN-US/GUID-B6EEC065-0BAB-4A19-8350-A3A9DA44AD1D.html)). Of macOS de fr970 zonder extra tool als schijf mount, is **niet geverifieerd**: forumberichten melden dat MTP niet native werkt en dat tools zoals OpenMTP nodig zijn (geen primaire bron). Een losse `.json` direct in de app-storage zetten wordt niet gedocumenteerd. `Storage` "is not accessible by the end user" ([Persisting Data](https://developer.garmin.com/connect-iq/core-topics/persisting-data/)), dus dat kan niet. Bij elke routewijziging moet je opnieuw bouwen en kopiëren |
| 5 | **GPX/FIT-course** naar native navigatie | De native Fiets-app met kaart en afslagaanwijzingen. Een CIQ-app kan zelf een GPX downloaden met `:responseType => HTTP_RESPONSE_CONTENT_TYPE_GPX`. Het systeem "will attempt to download and parse … and store the contained data in the device" ([Communications](https://developer.garmin.com/connect-iq/api-docs/Toybox/Communications.html), [Downloading Content](https://developer.garmin.com/connect-iq/core-topics/downloading-content/)). Daarna kun je met `System.exitTo(course.toIntent())` naar de native app (permissie Persisted Content) | Je zit dan in de native app en niet in de eigen UI met knoppen. Of GPX-`<wpt>`'s als benoemde coursepunten verschijnen, is **niet geverifieerd**. Import via de Garmin Connect-website of -app is **niet geverifieerd** (support.garmin.com gaf 403) |

**v1 (eenvoudigst):** optie 1. De Mac-app genereert een routecode (zie H), de app staat als Beta App in de store (geen MTP nodig, settings bewerkbaar) en de code wordt in de Garmin Connect-app geplakt. Om de onbekende stringlimiet te omzeilen, bevat v1 alleen de knooppunten, ongeveer 435 tekens.

**v2:** optie 2. De Mac-app publiceert JSON met knooppunten plus vereenvoudigde track naar een vaste HTTPS-URL. Het horloge haalt die op bij het starten van de app en cachet hem in `Storage`. Optioneel exporteert de Mac-app daarnaast een GPX (optie 5).

## E. Mac-app (SwiftUI)

- **Tooling:** Xcode 27.2 (Swift 6.4), vereist macOS Tahoe 26.6 of later. Kan bouwen voor macOS 12 tot en met 27 ([Xcode system requirements](https://developer.apple.com/xcode/system-requirements/)). Nu staan alleen de Command Line Tools geïnstalleerd (eigen meting), dus Xcode is nog nodig.
- **Minimum macOS:** kies macOS 14+ als je SwiftData gebruikt ([SwiftData](https://developer.apple.com/documentation/swiftdata): macOS 14.0). Codable-JSON-bestanden in Application Support zijn eenvoudiger, makkelijker te diffen en tegelijk het exportformaat. Voorkeur v1: **Codable JSON**.
- **GPX-import:** `fileImporter(isPresented:allowedContentTypes:onCompletion:)` (macOS 11, [Apple](https://developer.apple.com/documentation/swiftui/view/fileimporter(ispresented:allowedcontenttypes:oncompletion:))) plus `XMLParser` (macOS 10.0, [Apple](https://developer.apple.com/documentation/foundation/xmlparser)). Een streaming parser maakt het niet uit dat de ANWB-GPX op één regel staat. Kaartpreview: SwiftUI `Map` (macOS 11, [Apple](https://developer.apple.com/documentation/mapkit/map)).
- **Overpass vanuit de app:** `URLSession` POST naar `https://overpass-api.de/api/interpreter` met een eigen User-Agent. Daar geldt de fair use "<10.000 queries/dag, <1 GB/dag". Bij 429 of 406: 30 s wachten ([Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)). Cache resultaten lokaal per regio. Live merkte ik dat de server tijdelijk een 502 gaf ("at capacity"), dus een retry met backoff is nodig (eigen meting).
- **Publicatie:**
  - v1: routecode tonen met een kopieerknop (Universal Clipboard naar iPhone).
  - v2: JSON uploaden naar een statische HTTPS-host (eigen server, GitHub Gist/Pages, S3 o.i.d.). De concrete API's van die hosts zijn **niet onderzocht/niet geverifieerd**. Een iCloud-deellink levert geen ruwe JSON op (**niet geverifieerd**), dus die is ongeschikt voor `makeWebRequest`.
  - Optioneel: GPX-export.

## F. Knooppuntdata uit OpenStreetMap

**Tagging** ([Node Networks](https://wiki.openstreetmap.org/wiki/Node_Networks), [Key:rcn_ref](https://wiki.openstreetmap.org/wiki/Key:rcn_ref)):

- **Knooppunt (node):** `rcn_ref=<nr>` + `network:type=node_network`, optioneel `expected_rcn_route_relations=<n>`. In NL/BE zijn bijna alle knooppuntnetwerken `rcn`. Nummers kunnen een voorloopnul hebben (`03`) of niet (`9`); live data bevat beide (eigen meting). Normaliseer daarom naar een integer.
- **Verbinding (relation):** `type=route`, `route=bicycle`, `network=rcn`, `network:type=node_network`, `ref=mm-nn` (laagste-hoogste, bv. `12-45`). Eén of beide nummers kunnen een voorloopnul hebben (`04-05` en `7-8` komen allebei voor; eigen meting).
- **Netwerk (relation):** `type=network`, `network=rcn`, `network:type=node_network`, `name=*`.

**Overpass QL** (syntax: [Overpass QL](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL); bbox = zuid, west, noord, oost):

```overpassql
// 1. Alle knooppunten in een bbox
[out:json][timeout:60];
node["network:type"="node_network"]["rcn_ref"](51.64,5.27,51.73,5.40);
out body;
```

```overpassql
// 2. Knooppunt(en) met een bepaald nummer rond een punt (bij handmatige invoer)
[out:json][timeout:60];
node["network:type"="node_network"]["rcn_ref"~"^0?21$"](around:15000,51.70,5.34);
out body;
```

```overpassql
// 3. Verbindingen (route-relaties) in de bbox, alleen tags
[out:json][timeout:60];
rel["type"="route"]["route"="bicycle"]["network"="rcn"]["network:type"="node_network"](51.64,5.27,51.73,5.40);
out tags;
```

```overpassql
// 4. Relaties die een knooppunt raken (junction-nodes zijn vaak géén lid; ga via de ways)
[out:json][timeout:60];
node["network:type"="node_network"]["rcn_ref"~"^0?51$"](51.64,5.27,51.73,5.40)->.k;
way(bn.k)->.w;
rel(bw.w)["route"="bicycle"];
out tags;
```

Live resultaat (eigen meting, 2026-11-12): query 1 gaf 80 nodes en query 3 gaf 102 relaties.

**Kunnen opeenvolgende knooppunten op aansluiting worden gecontroleerd?** Ja, via `ref=mm-nn` van de route-relaties.

- Bij de test op `lokaal.gpx` hadden 19 van de 21 stappen een relatie. **59→51 en 51→03 hadden er geen.** De track loopt van 59 rechtstreeks naar 51 zonder langs 53 of 52 te komen (eigen meting). ANWB-data en OSM wijken hier dus af, of de route volgt een stuk zonder knooppuntrelatie.
- Conclusie: aansluiting is een **waarschuwing**, geen harde fout.
- Nauwkeuriger is controleren of de relatie de beide specifieke node-clusters verbindt (via de eindpunten van de member-ways). Nummers komen in een regio namelijk dubbel voor.

**Licentie:** ODbL. Vermeld "© OpenStreetMap contributors", maak duidelijk dat de data onder ODbL valt en link naar https://www.openstreetmap.org/copyright. Afgeleide databases mogen alleen onder dezelfde licentie worden verspreid ([OSM copyright](https://www.openstreetmap.org/copyright)). Toon de attributie in de Mac-app en in de app-beschrijving. De Overpass-response bevat zelf ook een ODbL-notice (eigen meting).

## G. Afstand en richting naar het volgende knooppunt

- **GPS:** `Position.enableLocationEvents(Position.LOCATION_CONTINUOUS, method(:onPosition))`. Vereist de permissie Positioning en werkt alleen in device apps en widgets ([Position](https://developer.garmin.com/connect-iq/api-docs/Toybox/Position.html)). Een optiedictionary met `:configuration` (bv. `CONFIGURATION_SAT_IQ`) kan sinds 3.3.6 ([Positioning](https://developer.garmin.com/connect-iq/core-topics/positioning/)). Locatie-events stoppen wanneer de app inactief wordt (`onInactive`).
- **`Position.Info`:**
  - `position` (Location), `accuracy` (`QUALITY_NOT_AVAILABLE`…`QUALITY_GOOD`, 0–4), `heading` (radialen, true north), `speed` (m/s) ([Position.Info](https://developer.garmin.com/connect-iq/api-docs/Toybox/Position/Info.html)).
  - Fix-interval "typically 1 second"; tussen fixes wordt de positie gedead-reckoned (zelfde bron).
- **Afstand en peiling:**
  - `Position.Location` heeft geen afstandsfunctie, alleen `toDegrees()`, `toRadians()`, `toGeoString()` en `getProjectedLocation()` ([Location](https://developer.garmin.com/connect-iq/api-docs/Toybox/Position/Location.html)). Haversine en peiling moet je dus zelf schrijven met `Math.sin/cos/atan2/sqrt` ([Math](https://developer.garmin.com/connect-iq/api-docs/Toybox/Math.html)).
  - Op knooppuntschaal (< 50 km) volstaat een equirectangulaire benadering: `x = Δλ·cos(φm)`, `y = Δφ`, `d = R·√(x²+y²)`. Dat is goedkoper.
  - Peiling = `atan2(sin Δλ·cos φ2, cos φ1·sin φ2 − sin φ1·cos φ2·cos Δλ)`. Relatieve pijl = peiling − `heading`.
- **Coördinaten nodig?** Ja. Zonder lat/lon per knooppunt is er geen afstand, richting of automatische detectie mogelijk. Het routeformaat bevat ze daarom altijd.
- **Batterij:** volgens de handleiding houdt de batterij het tot 26 uur uit met alleen GPS, en tot 21 uur met All + Multi-Band ([Battery Life](https://www8.garmin.com/manuals/webhelp/GUID-025D75CF-3445-49E1-8D81-1AA74AB4E00F/EN-US/GUID-1933DAC3-8171-4995-A1F0-CD298E1F5A33.html)). Wat een Connect IQ-app met continue location events extra verbruikt, is **niet geverifieerd**. Of een opnamesessie plus `enableLocationEvents` één gedeelde GNSS-ontvanger gebruikt, is ook **niet geverifieerd** (vermoedelijk wel). Voor deze toepassing volstaat `CONFIGURATION_SAT_IQ` of GPS+Galileo; multi-band is niet nodig.

## H. GPX-import en locatiegebaseerde knooppuntbepaling

### H1. Analyse van `lokaal.gpx` (eigen meting)

- GPX 1.0 (`http://www.topografix.com/GPX/1/0`), `creator="ANWB"`, 43.361 bytes, één regel.
- 31 `<wpt>` met `<name>Knooppunt NN</name>` (`05` naast `9`) en 1 `<trk>` met 1076 `<trkpt>`, waarbij `lon` vóór `lat` staat (attribuutvolgorde maakt niet uit voor XMLParser). Tracklengte 31,4 km.
- Na het samenvoegen van opeenvolgende waypoints met hetzelfde nummer blijven **22 routestappen** over: `93 99 94 80 5 4 82 72 77 76 21 40 9 8 84 88 53 59 51 3 42 93`.
- Samengevoegde afstanden: 99: 41 m; **82: 109 m**; 8: 22 m; 84: 26 m + 54 m; 53: 12 m; 59: 38 m + 0 m (59 komt drie keer voor, de eerste en derde zijn identiek); 51: 41 m.
- **Elk waypoint valt exact (0 m) samen met een OSM-node** `network:type=node_network` met hetzelfde `rcn_ref`. De ANWB exporteert dus de OSM-nodes. Meerdere nodes per knooppunt horen bij één knooppunt dat bijvoorbeeld over een kruising of rotonde is gemapt. In de bbox heeft 84 zes nodes (max. 63 m uit elkaar) en 90 vier (89 m).
- **Nummers zijn regionaal niet uniek:** 21 komt twee keer voor, 4,1 km uit elkaar.
- De track passeert de knooppunten in routevolgorde met oplopende trkpt-index (93 bij index 0 … 42 bij 969 … 93 aan het eind). Elk knooppunt kan daarom aan een trackpositie worden gekoppeld.

### H2. Importregels (Mac-app)

1. Parse `<wpt>` in documentvolgorde. Nummer = `Int(naam zonder "Knooppunt ")`, dus "05" wordt 5.
2. **Samenvoegen:** een waypoint wordt toegevoegd aan de vorige stap als het nummer gelijk is **en** de afstand tot die cluster ≤ 200 m. Bewaar alle punten van de cluster (voor detectie) plus het zwaartepunt (voor weergave). Een gelijk nummer op meer dan 200 m afstand wordt een nieuwe stap. Dat komt bij lussen niet voor, maar is een veilige grens.
3. **Herhalingen behouden:** 93 aan begin en eind blijven twee aparte stappen. Identiteit = **index in de route**, niet het nummer.
4. Koppel elke stap aan de trackindex van het dichtstbijzijnde trkpt, zoekend vanaf de index van de vorige stap (monotoon).
5. Vereenvoudig de track met Douglas-Peucker en bewaar de trkpts van de knooppunten. Gemeten op deze route: ε=5 m geeft 281 punten, 10 m geeft 181, 15 m geeft 152, 25 m geeft 111 en 50 m geeft 73. Advies: **ε = 10 m**.
6. Optioneel: verrijk de stap met het OSM-node-cluster (query 2 rond het waypoint) en valideer aansluitingen (F).

**Handmatige invoer:**

- Gebruiker typt nummers en kiest een regio (kaartklik of bbox). De app haalt alle kandidaat-nodes per nummer op (query 1) en clustert ze per nummer binnen 200 m.
- Bij meerdere clusters met hetzelfde nummer kiest de app de cluster die via een `ref=mm-nn`-relatie aansluit op de vorige stap of het dichtst bij de vorige stap ligt. Twijfelgevallen toont hij op de kaart.
- Zonder track kan het horloge alleen werken met knooppuntcoördinaten. Dat volstaat voor v1.

### H3. Compact routeformaat

JSON (v2, `makeWebRequest`):

```json
{"v":1,"n":"lokaal",
 "j":[[93,5171976,536379],[99,5171068,537615], …],
 "t":[[5171976,536379],[4,18], …]}
```

- `j` = stappen `[nummer, lat·1e5, lon·1e5]` als integers (1e-5° ≈ 1,1 m); clusterpunten eventueel als extra paren.
- `t` = vereenvoudigde track: het eerste punt absoluut, daarna delta's. Integers voorkomen afrondingsproblemen met Float in Monkey C (Float is 32-bit, [Float](https://developer.garmin.com/connect-iq/api-docs/Toybox/Lang/Float.html); `Double` is 64-bit, [Double](https://developer.garmin.com/connect-iq/api-docs/Toybox/Lang/Double.html)).
- `makeWebRequest` levert JSON aan als `Dictionary`/`Array`, dus er is geen eigen parser nodig ([Communications](https://developer.garmin.com/connect-iq/api-docs/Toybox/Communications.html)).

Routecode (v1, settings-string): `93,51.71976,5.36379;99,51.71068,5.37615;…`. Eventueel met integers en zonder decimalen om ruimte te sparen.

**Gemeten groottes voor `lokaal.gpx`:**

| Inhoud | Grootte |
|---|---|
| 22 stappen als decimale string | 435 tekens |
| Track ε=10 m (181 pt), decimaal | 3.076 tekens |
| Track ε=10 m, delta-integers | 1.410 tekens |
| Volledige JSON (stappen + delta-track ε=10 m) | 2.264 bytes |
| Idem bij ε=25 m (111 pt) | 1.629 bytes |

**Haalbaarheid:**

- Geheugen: 181 punten × 2 getallen plus 22 stappen is enkele KB aan objecten, verwaarloosbaar ten opzichte van 768 KB. De exacte objectoverhead per Monkey C-element is **niet geverifieerd**; meet die met de memory viewer van de simulator.
- `Storage`: maximaal 32 KB per waarde ([Persisting Data](https://developer.garmin.com/connect-iq/core-topics/persisting-data/)), dus dit past.
- BLE: 2,3 KB duurt bij 400–800 B/s enkele seconden ([REST FAQ](https://developer.garmin.com/connect-iq/connect-iq-faq/how-do-i-use-rest-services/)).
- Settings: de track (≥1,4 KB) via een settings-string is riskant zolang de limiet **niet geverifieerd** is. Daarom gaat in v1 alleen de knooppuntlijst via settings en de track pas in v2 via `makeWebRequest`.

### H4. Algoritme op het horloge

**Toestand:** `target` = index van het volgende knooppunt (stap), `progress` = trackindex (alleen v2), `manualUntil` = tijdstip.

1. **Filter:** verwerk alleen fixes met `accuracy >= QUALITY_USABLE`. Bij elke `onPosition` (ongeveer 1 Hz) bereken je de afstand `d` tot het **dichtstbijzijnde punt van de cluster** van `target`, niet tot het zwaartepunt. Daarmee is 82 met nodes 109 m uit elkaar te dekken.
2. **Aankomst met hysterese:**
   - `arrived` = minstens 2 opeenvolgende fixes met `d < R_in`. Advies: `R_in` = 25 m (30 m bij een snelheid boven 25 km/h).
   - Op dat moment toon je "✓ 84" en ga je naar de toestand *bij knooppunt*.
   - Pas wanneer `d > R_out` (50 m) **of** wanneer de afstand tot `target+1` daalt, zet je `target += 1`. Zo flikkert de weergave niet bij een stoplicht op het knooppunt.
3. **Volgorde-afhankelijkheid:** controleer standaard alleen `target` en een **lookahead** van `target+1` en `target+2`. Kom je binnen `R_in` van een later knooppunt, dan spring je daarheen, bijvoorbeeld als een knooppunt werd gemist door slecht GPS-signaal. Eerdere knooppunten worden genegeerd. Daardoor stoppen dubbele nummers (93 begin/eind, of een knooppunt dat twee keer wordt gepasseerd) de route niet: de match gebeurt op index.
4. **Start:** bij het opstarten zoek je de dichtstbijzijnde stap. Ligt die binnen `R_in` en is het index 0, dan wordt `target` = 1. Anders wordt `target` = 0, of (v2) de eerste stap na de projectie op de track.
5. **Trackvoortgang (v2):**
   - Projecteer de positie op de vereenvoudigde track, alleen binnen het venster `[progress − 5, progress + 40]`. Dat is monotoon en voorkomt dat de projectie bij een lus of een kruisend eigen spoor terugspringt.
   - `target` = eerste stap met trackindex > `progress`.
   - Afstand langs de track tot het volgende knooppunt = som van de segmenten, wat beter is dan hemelsbreed.
   - Ligt de positie meer dan 75 m van de track, dan toon je "van route" en val je terug op logica 2 en 3.
6. **Handmatige override:**
   - UP/DOWN zet `target` ±1, ENTER zet `target` +1.
   - Gedurende `manualUntil` (bijvoorbeeld 60 s), of totdat de gebruiker binnen `R_in` van het nieuwe target komt, schakelt de automatiek niet terug. Daarna gaat hij verder vanaf de nieuwe index (in v2 wordt `progress` gezet op de trackindex van die stap).
   - Trillen bij automatisch doorschakelen gaat via `Attention.vibrate` (permissie niet nodig; module beschikbaar volgens [App Types](https://developer.garmin.com/connect-iq/connect-iq-basics/app-types/)).
7. **Weergave:** groot nummer van het volgende knooppunt, klein het nummer daarna, afstand (langs de track of hemelsbreed) en een richtingspijl. Wit op zwart (AMOLED, zie B).

**Testen:** de simulator speelt een FIT-bestand af (*Simulation > FIT Data > Playback File…*; [App Types](https://developer.garmin.com/connect-iq/connect-iq-basics/app-types/)). Rijd een rondje met de native Fiets-app en speel die FIT af tegen de route. Of de playback ook `Position`-events voedt in een watch-app (en niet alleen `Activity.Info`), is **niet geverifieerd**.

---

## Stappenplan

1. **Ontwikkelomgeving**
   - Installeer een Java Runtime 11 of hoger (ontbreekt nu), Xcode 27.x (nu alleen CLT) en de Connect IQ SDK Manager.
   - Installeer via de SDK Manager SDK 9.3.0 en het device `fr970`, en de VS Code-extensie "Monkey C".
   - Draai `Verify Installation` en genereer een developer key. Maak een back-up van de key buiten de repo, want die is nodig voor updates.
2. **Spike op het horloge:** maak een `watch-app` met `minApiLevel` 6.0 en product `fr970`. Toon "Knooppunt 12" en log `onKey`-codes in de simulator. Stel daarmee de mapping UP/DOWN/START/BACK vast en test of touch tot een ongewenste `onSelect`/swipe leidt.
3. **Eerste sideload:** `Monkey C: Build for Device` geeft een PRG die naar `GARMIN/APPS` moet ([Your First App](https://developer.garmin.com/connect-iq/connect-iq-basics/your-first-app/)). Test of de fr970 op macOS via MTP bereikbaar is. Lukt dat niet, upload de app dan direct als Beta App (stap 8).
4. **Route-model op het horloge:**
   - Bak een testroute in als `jsonData` (gegenereerd uit `lokaal.gpx`).
   - Maak navigatie via knoppen en een opname met `ActivityRecording` (`SPORT_CYCLING`): START start/stopt, BACK geeft lap of menu, en opslaan of verwerpen.
5. **GPS-logica (H4):** haversine/equirectangulair, aankomst met hysterese, lookahead en override. Test in de simulator met FIT-playback en daarna buiten.
6. **Mac-app v1 (SwiftUI):**
   - Routes als Codable JSON.
   - GPX-import met samenvoegen (H2).
   - Handmatige invoer met Overpass-lookup en disambiguatie.
   - Kaartpreview, aansluitingscontrole als waarschuwing, ODbL-attributie.
   - Export als routecode.
7. **Settings op het horloge:** voeg in `resources` een property `routeCode` (string) toe met een `alphaNumeric`-setting. Lees de waarde in `onStart` en `onSettingsChanged`, parse en valideer haar, en bewaar het resultaat in `Storage`. Test eerst in de simulator (*File > Edit Persistent Storage > Edit Application.Properties data*).
8. **Beta App:** gebruik in het manifest een aparte UUID, `Monkey C: Export Project` (`.iq`) en upload met "Beta App". Installeer via de store op de fr970 en plak de routecode in de Garmin Connect-app ([Beta Apps](https://developer.garmin.com/connect-iq/core-topics/beta-apps/), [Publishing](https://developer.garmin.com/connect-iq/core-topics/publishing-to-the-store/)). Meet hier de werkelijke maximale stringlengte.
9. **Praktijktest** van de route uit `lokaal.gpx`. Controleer:
   - de aankomststralen;
   - de batterij;
   - het schermgedrag tijdens de opname;
   - dat de FIT goed in Garmin Connect binnenkomt.
10. **v2:**
    - De Mac-app publiceert JSON (knooppunten plus delta-track) naar HTTPS.
    - Het horloge doet `makeWebRequest` en cachet in `Storage`.
    - Voeg trackvoortgang toe (H4.5).
    - Optioneel: GPX-export of -download voor native course-navigatie.
11. **Optioneel publiceren in de Connect IQ Store:** gebruik de productie-UUID en vul beschrijving, screenshots, ODbL-attributie en privacy/GDPR in. De review duurt doorgaans binnen 72 uur ([Publishing](https://developer.garmin.com/connect-iq/core-topics/publishing-to-the-store/)).

## Open vragen

1. Wat is de **maximale lengte van een string-setting** in de Garmin Connect-app? Dat bepaalt of v1 via settings werkt. Meten in stap 8.
2. Werken app-settings in Garmin Connect ook voor **gesideloade** (USB) apps, of alleen voor store- en beta-apps?
3. Mount de fr970 op macOS via MTP of "Garmin mode" zonder extra tool? **Antwoord (13-11-2026): nee.** Ook in MTP-modus meldt hij zich als `091e:0003`, klasse 255, zonder MTP-interface; OpenMTP ziet hem niet. Daarom de Beta App-route.
4. Welke exacte `KEY_*`-codes geven de fr970-knoppen, en houdt de systeeminstelling "Touch uit" ook touch-events in Connect IQ-apps tegen?
5. Wat is het **schermgedrag** van een watch-app op AMOLED tijdens een opname: time-out, gebaar-activering, always-on?
6. Wat kost `LOCATION_CONTINUOUS` naast een opnamesessie aan **batterij**, en delen ze de GNSS-ontvanger?
7. Wat is de maximale **responsegrootte** van `makeWebRequest` op de fr970?
8. Waar komt de JSON in v2 te staan (eigen domein, Gist, Pages)? Is een publieke URL acceptabel (privacy van routes)?
9. Moet de aansluitingscontrole ANWB-afwijkingen accepteren (zoals 59→51 en 51→03 zonder OSM-relatie)? Advies: waarschuwen, niet blokkeren.
10. Moet het horloge ook de gereden route vergelijken (van-route-melding) in v1, of pas in v2 met de track?

## Bronnen

**Garmin Connect IQ (developer.garmin.com)**
- SDK: https://developer.garmin.com/connect-iq/sdk/
- Compatible devices: https://developer.garmin.com/connect-iq/compatible-devices/
- Device reference fr970: https://developer.garmin.com/connect-iq/device-reference/fr970/
- Getting Started: https://developer.garmin.com/connect-iq/connect-iq-basics/getting-started/
- Your First App (incl. sideload): https://developer.garmin.com/connect-iq/connect-iq-basics/your-first-app/
- App Types: https://developer.garmin.com/connect-iq/connect-iq-basics/app-types/
- Input Handling: https://developer.garmin.com/connect-iq/core-topics/input-handling/
- Activity Recording: https://developer.garmin.com/connect-iq/core-topics/activity-recording/
- JSON REST Requests (HTTPS): https://developer.garmin.com/connect-iq/core-topics/https/
- Properties and App Settings: https://developer.garmin.com/connect-iq/core-topics/properties-and-app-settings/
- Persisting Data: https://developer.garmin.com/connect-iq/core-topics/persisting-data/
- Positioning: https://developer.garmin.com/connect-iq/core-topics/positioning/
- Downloading Content: https://developer.garmin.com/connect-iq/core-topics/downloading-content/
- Resources: https://developer.garmin.com/connect-iq/core-topics/resources/
- Manifest and Permissions: https://developer.garmin.com/connect-iq/core-topics/manifest-and-permissions/
- Communicating with Mobile Apps: https://developer.garmin.com/connect-iq/core-topics/communicating-with-mobile-apps/
- Mobile SDK for iOS: https://developer.garmin.com/connect-iq/core-topics/mobile-sdk-for-ios/
- Beta Apps: https://developer.garmin.com/connect-iq/core-topics/beta-apps/
- Publishing to the Store: https://developer.garmin.com/connect-iq/core-topics/publishing-to-the-store/
- Jungle Reference: https://developer.garmin.com/connect-iq/reference-guides/jungle-reference/
- VS Code Extension: https://developer.garmin.com/connect-iq/reference-guides/visual-studio-code-extension/
- Command Line Setup: https://developer.garmin.com/connect-iq/reference-guides/monkey-c-command-line-setup/
- REST FAQ: https://developer.garmin.com/connect-iq/connect-iq-faq/how-do-i-use-rest-services/
- AMOLED FAQ: https://developer.garmin.com/connect-iq/connect-iq-faq/how-do-i-make-a-watch-face-for-amoled-products/
- Lang.Float / Lang.Double: https://developer.garmin.com/connect-iq/api-docs/Toybox/Lang/Float.html, https://developer.garmin.com/connect-iq/api-docs/Toybox/Lang/Double.html

**Garmin Connect IQ API-docs**
- BehaviorDelegate: https://developer.garmin.com/connect-iq/api-docs/Toybox/WatchUi/BehaviorDelegate.html
- InputDelegate: https://developer.garmin.com/connect-iq/api-docs/Toybox/WatchUi/InputDelegate.html
- DataField: https://developer.garmin.com/connect-iq/api-docs/Toybox/WatchUi/DataField.html
- ActivityRecording: https://developer.garmin.com/connect-iq/api-docs/Toybox/ActivityRecording.html
- Session: https://developer.garmin.com/connect-iq/api-docs/Toybox/ActivityRecording/Session.html
- Activity.Info: https://developer.garmin.com/connect-iq/api-docs/Toybox/Activity/Info.html
- Communications: https://developer.garmin.com/connect-iq/api-docs/Toybox/Communications.html
- Position: https://developer.garmin.com/connect-iq/api-docs/Toybox/Position.html
- Position.Location: https://developer.garmin.com/connect-iq/api-docs/Toybox/Position/Location.html
- Position.Info: https://developer.garmin.com/connect-iq/api-docs/Toybox/Position/Info.html
- Math: https://developer.garmin.com/connect-iq/api-docs/Toybox/Math.html
- Application.Properties: https://developer.garmin.com/connect-iq/api-docs/Toybox/Application/Properties.html

**Garmin Forerunner 970-handleiding (www8.garmin.com)**
- Button Functions: https://www8.garmin.com/manuals/webhelp/GUID-025D75CF-3445-49E1-8D81-1AA74AB4E00F/EN-US/GUID-E9B8D548-6B6D-4050-8F3B-145B48B3CFF5.html
- Touchscreen: https://www8.garmin.com/manuals/webhelp/GUID-025D75CF-3445-49E1-8D81-1AA74AB4E00F/EN-US/GUID-C8435F75-31AA-497C-88E8-2944AA182AEA.html
- Activity Settings: https://www8.garmin.com/manuals/webhelp/GUID-025D75CF-3445-49E1-8D81-1AA74AB4E00F/EN-US/GUID-3BFA3493-11F9-4CCC-8394-6440CE6A93D7.html
- Advanced System Settings (USB Mode): https://www8.garmin.com/manuals/webhelp/GUID-025D75CF-3445-49E1-8D81-1AA74AB4E00F/EN-US/GUID-B6EEC065-0BAB-4A19-8350-A3A9DA44AD1D.html
- Wi-Fi: https://www8.garmin.com/manuals/webhelp/GUID-025D75CF-3445-49E1-8D81-1AA74AB4E00F/EN-US/GUID-A320BB2B-B192-4CDF-931E-52FC01144D1E.html
- Battery Life: https://www8.garmin.com/manuals/webhelp/GUID-025D75CF-3445-49E1-8D81-1AA74AB4E00F/EN-US/GUID-1933DAC3-8171-4995-A1F0-CD298E1F5A33.html
- Specifications: https://www8.garmin.com/manuals/webhelp/GUID-025D75CF-3445-49E1-8D81-1AA74AB4E00F/EN-US/GUID-DEC2B782-96E8-4287-8C8A-5907CC9D3B35.html

**Apple**
- Xcode system requirements: https://developer.apple.com/xcode/system-requirements/
- SwiftData: https://developer.apple.com/documentation/swiftdata
- fileImporter: https://developer.apple.com/documentation/swiftui/view/fileimporter(ispresented:allowedcontenttypes:oncompletion:)
- XMLParser: https://developer.apple.com/documentation/foundation/xmlparser
- MapKit Map (SwiftUI): https://developer.apple.com/documentation/mapkit/map

**OpenStreetMap**
- Node Networks: https://wiki.openstreetmap.org/wiki/Node_Networks
- Key:rcn_ref: https://wiki.openstreetmap.org/wiki/Key:rcn_ref
- Overpass API (instances, fair use): https://wiki.openstreetmap.org/wiki/Overpass_API
- Overpass QL: https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL
- Copyright/ODbL: https://www.openstreetmap.org/copyright
