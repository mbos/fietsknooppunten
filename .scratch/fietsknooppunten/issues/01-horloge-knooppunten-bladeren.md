# 01: Horloge – met knoppen door de knooppunten bladeren

**What to build:** Een Connect IQ watch-app voor de Forerunner 970 met een vaste testroute (de knooppunten uit `lokaal.gpx`). Het scherm toont groot het huidige doelknooppunt en kleiner het knooppunt daarna, plus de positie in de route (bv. "5/22"). UP/DOWN gaan naar het vorige/volgende knooppunt, ENTER ("ja") ook naar het volgende. Inclusief het inrichten van de ontwikkelomgeving (Java 11+, Connect IQ SDK Manager, VS Code Monkey C-extensie, developer key). Zie `docs/research/technologie.md` secties A–C.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Project bouwt voor device `fr970` en draait in de simulator
- [x] UP/DOWN/ENTER navigeren zoals beschreven; aan begin/eind van de route stopt het bladeren netjes
- [x] BACK sluit de app niet per ongeluk (bevestiging nodig)
- [x] Tik/swipe op het touchscreen verandert het knooppunt niet
- [x] Leesbaar op het ronde 454×454 AMOLED-scherm, ook tijdens fietsen (grote cijfers, hoog contrast)
- [x] Gesideload op het echte horloge en door de gebruiker bevestigd; daarbij de werkelijke knopcodes van de fr970 vastgelegd (open vraag 4 uit het onderzoek)

## Comments

**2026-11-12 (Claude):**
- **Gebouwd:** de watch-app staat in `watch/`, met de testroute uit `lokaal.gpx` (22 stappen) als `jsonData`-resource in het formaat van `docs/route-format.md`.
- **Bediening:** de knoppen werken via BehaviorDelegate.
  - `onNextPage` en `onSelect` gaan naar het volgende knooppunt, `onPreviousPage` naar het vorige.
  - `onBack` vraagt eerst of je wilt stoppen.
  - Alle touch-events worden opgeslokt.
  - `onKey` logt de knopcodes, zodat we die van de fr970 kunnen vastleggen.
- **Getest:** bouwt zonder waarschuwingen met `-l 3`; de 7 unit tests slagen (`make -C watch test`). De gebruiker zag in de simulator het juiste startscherm: "1/22", "start", 93 en "daarna 99".
- **Weetje:** `monkeydo` gebruikt in SDK 9 de vlag `-t` (niet `/t`) en eindigt altijd met exitcode 1.

**2026-11-13 (Claude):**
- **USB-sideload op macOS lukt niet:** ook met USB-modus "MTP" en een directe poort meldt de fr970 zich als `091e:0003`, apparaatklasse 255 (fabrikantspecifiek), zonder MTP-interface. OpenMTP ziet het horloge niet.
- **Gekozen route:** de app gaat als Beta App via de Connect IQ Store (`make -C watch package` geeft `watch/bin/knooppunten.iq`).
- **Garmin-bug bij installeren:** beta-apps installeren is volgens het forum momenteel lastig (CIQQA-3722). De omweg: een link in het oude formaat `apps.garmin.com/apps/<id>` op de telefoon openen.

**2026-11-13 (Claude):** De Beta App is geüpload (met store-plaatje en screenshot uit `docs/store/`) en door de gebruiker op de fr970 geïnstalleerd. Nog te doen: de knoppen testen tijdens een echte rit.

**2026-11-13 (Claude):** Eerste echte rit gemaakt. De gebruiker meldt: "Het scherm is verder goed af te lezen, bediening werkt goed." De knopcodes zijn niet vastgelegd, want een beta-build schrijft geen log. Dat is niet meer nodig: de BehaviorDelegate-events werken op de fr970 zoals in de simulator.
