# 03: Horloge – rit opnemen als fietsactiviteit

**What to build:** De watch-app neemt de rit op als fietsactiviteit (`ActivityRecording`, `SPORT_CYCLING`, permissie Fit), zodat de rit na afloop in Garmin Connect staat, terwijl het knooppuntenscherm uit 01 zichtbaar blijft. Starten, pauzeren, stoppen en opslaan/verwerpen via een eenvoudige flow die niet botst met de knooppuntknoppen. Zie `docs/research/technologie.md` sectie C.

**Blocked by:** 01

**Status:** done

- [x] Rit starten, pauzeren/hervatten, stoppen en opslaan of verwerpen
- [x] Opgeslagen rit verschijnt in Garmin Connect als fietsrit met GPS-track
- [x] Knooppuntnavigatie met UP/DOWN/ENTER blijft werken tijdens de opname
- [x] Gedrag van het AMOLED-scherm tijdens opname (time-out/always-on) onderzocht en vastgelegd (open vraag 5)
- [x] Op het echte horloge getest met een korte rit

## Comments

**2026-11-12 (Claude):**
- **Ontwerpkeuze:** START betekent in deze app "volgend knooppunt". De opname start daarom automatisch bij het openen van de app (`SPORT_CYCLING`, `SUB_SPORT_ROAD`).
- **Ritmenu:** BACK en MENU (UP lang indrukken) openen een menu met Doorgaan, Pauzeren/Hervatten, Opslaan en stoppen, en Verwijderen. Verwijderen vraagt eerst om bevestiging.
- **Afsluiten:** sluit de app onverwacht af (`onStop`), dan wordt de rit bewaard en niet weggegooid.
- **Scherm:** onderaan rijtijd en afstand ("0:12:34  5,2 km"); oranje "gepauzeerd" of "zoekt GPS" als dat van toepassing is.
- **Permissies:** Fit en Positioning.
- **Getest:** de build slaagt met `-l 3`; 9 unit tests slagen (2 nieuwe voor `Format`). De opname-flow is nog niet met de hand getest.

**2026-11-13 (Claude):**
- **GPS-status:** in de simulator kwamen bij stilstand geen location events binnen, waardoor "zoekt GPS" bleef staan. `hasGpsFix` vraagt nu elke seconde `Position.getInfo()` op. Elke binnenkomende positie wordt gelogd voor debuggen.
- **Getest:** de gebruiker heeft de flow in de simulator gecontroleerd en die werkt.
- **Nog open:** controleren op het echte horloge.

**2026-11-13 (Claude), eerste rit (6:48 min, 2,17 km):**
- **Garmin Connect:** de rit staat erin als fietsrit met GPS-track. De FIT-export bevat sport 2 (cycling) en subsport 7 (road); het record heeft 132 trackpunten met smart recording.
- **Scherm:** volgens de gebruiker goed af te lezen.
- **Activiteitstype:** de gebruiker wil geen "wegwielrennen". De subsport is nu `SUB_SPORT_GENERIC` (gewoon "Fietsen"). Een keuze voor e-bike (`SUB_SPORT_E_BIKE_FITNESS`) kan later als app-instelling, samen met de instellingen uit ticket 04.
- **Batterij:** de rit was te kort voor een zinnige meting.
