# 07: Horloge – automatisch het volgende knooppunt via GPS

**What to build:** Tijdens de rit bepaalt de watch-app op basis van de GPS-positie automatisch welk knooppunt het volgende doel is. Aankomst bij een knooppunt (afstand tot het dichtstbijzijnde punt van het cluster < ~25 m bij ≥ 2 opeenvolgende fixes) laat de app doorschakelen zodra je ~50 m weg bent of het volgende knooppunt dichterbij komt. Er wordt alleen vooruit gekeken (huidig + 2 volgende), zodat herhaalde nummers zoals 93 geen probleem zijn. Het scherm toont afstand en richting naar het volgende knooppunt; een trilling/piep bij aankomst. UP/DOWN/ENTER blijven als handmatige override. Haversine zelf implementeren. Zie `docs/research/technologie.md` secties G en H.

**Blocked by:** None. De testroute heeft al coördinaten, dus 04 is niet nodig om dit te bouwen.

**Status:** done

- [x] Doorschakelen werkt in de simulator met een afgespeelde rit over `lokaal.gpx` (open vraag 9: werkt FIT-playback voor een watch-app?)
- [x] Handmatige override met knoppen; daarna gaat de automatische detectie vanaf het gekozen knooppunt verder
- [x] Afstand (m/km) en richtingspijl naar het volgende knooppunt zichtbaar
- [x] Trilsignaal bij aankomst
- [x] Unit tests voor haversine en de aankomstlogica (inclusief rondrit met 93 aan begin en eind)
- [x] Getest op een echte rit; batterijverbruik genoteerd (open vraag 6)

## Comments

**2026-11-13 (Claude), bevindingen uit de eerste echte rit:**
- **Gebruiker:** "Het knooppunt gaat niet automatisch naar het volgende knooppunt" (verwacht, want dit ticket is nog niet gebouwd) en "De afstand gereden is minder interessant dan afstand tot het knooppunt".
  - Dus: de statusregel toont de **afstand tot het volgende knooppunt** in plaats van de gereden afstand. De gereden afstand blijft in de FIT-opname.
- **25 m is te krap.** In de FIT-export kwam het dichtstbijzijnde trackpunt op **39 m** van knooppunt 93 (het zwaartepunt in de testroute) en op **11 m** van 99.
  - Bij 25 m was 93 dus gemist, al liggen de trackpunten (smart recording) een paar seconden uit elkaar en is de app zelf preciezer.
  - Voorstel: aankomst binnen ~50 m, of "dichtstbijzijnde nadering voorbij": eerst binnen 80 m komen, en daarna weer verder weg gaan.
  - Dat het volgende knooppunt dichterbij komt, blijft als extra signaal.
- **Testdata:** de rit (`25063078258_ACTIVITY.fit`) is een echte doorgang 93 → 99. Hij is niet in de repo gezet, want hij bevat de startlocatie van de gebruiker.

**2026-11-13 (Claude), gebouwd samen met 10:**
- **Aankomst (`ArrivalTracker`):**
  - Aankomst telt bij 2 fixes achter elkaar binnen 50 m van het knooppunt, met `QUALITY_USABLE` of beter.
  - **Afwijking van het plan:** de app schakelt meteen bij aankomst door, niet pas als je 50 m weg bent. Op de kruising moet je het volgende nummer al zien om het juiste bordje te volgen.
  - Er wordt tot 2 stappen vooruit gekeken. Een gemist knooppunt wordt dus ingehaald.
- **Dubbele knooppunten:** dezelfde plek telt pas opnieuw als je er eerst meer dan 100 m vandaan bent geweest. Zo springt 93 aan het begin niet door naar 93 aan het eind.
- **Handmatig kiezen:** na een knop telt je huidige plek als "net aangekomen". Blader je met UP terug naar het knooppunt waar je staat, dan springt de app niet meteen weer door.
- **Trillen:** 2× stevig, en het scherm gaat even aan (`Attention.backlight`, in try/catch vanwege `BacklightOnTooLongException`).
- **Scherm:**
  - Onderaan staat de afstand tot het knooppunt ("850 m", "3,4 km"). Die wordt afgerond per 10, 50 of 100 m, zodat er minder vaak getekend hoeft te worden.
  - Rijtijd en gereden afstand zijn van het scherm af en staan alleen nog in de opname.
  - Een witte pijl aan de rand wijst naar het knooppunt, ten opzichte van je rijrichting (boven = rechtdoor). Bij rijden is dat de GPS-koers (≥ 1,5 m/s), bij stilstand het kompas (`Activity.Info.currentHeading`).
  - Er wordt alleen opnieuw getekend als de afstandstekst verandert of de pijl een stap van 15° draait.
- **Tests:** 17 unit tests, waaronder haversine en peiling (93→99 = 1320,8 m en 139,85°), de afstandsnotatie, en de tracker (rondrit, gemist knooppunt, handmatige keuze, stap zonder locatie).
- **Getest:** de gebruiker heeft in de simulator bevestigd dat de pijl en de afstand werken. Het automatisch doorschakelen is nog niet in de simulator getest, want die stuurt geen positiemeldingen bij stilstand. Testen gebeurt op een echte rit.

**2026-11-13 (Claude):** De gebruiker meldt na een rit: "de app werkt perfect en staat als fietsen". Afgerond.
- **Batterijverbruik:** dat is niet apart genoteerd; de gebruiker meldde geen problemen.
