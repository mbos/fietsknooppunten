# 05: Mac – GPX importeren

**What to build:** De gebruiker opent een GPX-bestand (zoals de ANWB-export `lokaal.gpx`) in de Mac-app en krijgt een route met knooppunten en hun coördinaten. Waypoints met naam "Knooppunt NN" worden stappen; opeenvolgende waypoints met hetzelfde nummer binnen ~200 m worden samengevoegd; nummers worden genormaliseerd ("05" = "5"). De track wordt ingelezen en bewaard voor later gebruik (ticket 08), maar nog niet verstuurd. Zie `docs/research/technologie.md` sectie H.

**Blocked by:** 02

**Status:** done

- [x] Import van `lokaal.gpx` levert de verwachte 22 stappen op, met 93 aan begin én eind
- [x] Ondersteunt GPX 1.0 en 1.1
- [x] Bestand zonder knooppunt-waypoints geeft een duidelijke melding
- [x] Geïmporteerde route is daarna gewoon te bewerken en te versturen
- [x] Unit tests met `lokaal.gpx` als fixture

## Comments

**2026-11-12 (Claude):**
- **Gebouwd:**
  - `GPXImporter` in RouteKit leest GPX 1.0 en 1.1 met XMLParser, ongeacht de namespace.
  - Opeenvolgende waypoints met hetzelfde nummer binnen 200 m worden samengevoegd.
  - Per stap worden alle punten van het knooppunt bewaard (`clusterPoints`), met hun midden als `coordinate`.
  - De track wordt bewaard in `Route.track`.
- **In de app:** toolbarknop "Importeer GPX…" (⌘I).
- **Tests:** 10 nieuwe, met `lokaal.gpx` als fixture. Eén test controleert dat de import exact de testroute van de horloge-app oplevert.
- **Let op voor ticket 07:** `clusterPoints` gaan nog niet naar het horloge, want het horlogeformaat v1 heeft per stap maar één punt. Voor knooppunt 82 liggen de punten 109 m uit elkaar, dus aankomstdetectie heeft ze nodig. Het formaat moet dan worden uitgebreid.

**2026-11-13 (Claude):** Door de gebruiker gecontroleerd in de app; de import werkt.
