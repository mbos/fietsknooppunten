# 02: Mac – route handmatig invoeren

**What to build:** Een SwiftUI macOS-app waarin de gebruiker een route maakt door knooppuntnummers in te typen (bv. 93 → 99 → 94 …), de volgorde kan aanpassen, stappen kan verwijderen en de route een naam geeft. Routes worden lokaal bewaard als Codable JSON in het routeformaat uit het onderzoek (geordende lijst stappen met nummer en optioneel lat/lon; herhalingen zoals 93 aan begin en eind blijven aparte stappen). Coördinaten komen in ticket 06; hier mogen ze nog leeg zijn. Zie `docs/research/technologie.md` secties E en H.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Nieuwe route aanmaken, nummers toevoegen, herordenen, verwijderen, hernoemen
- [x] Meerdere routes bewaren en na herstart terugzien
- [x] "05" en "5" worden als hetzelfde knooppuntnummer behandeld
- [x] Het routeformaat is vastgelegd en gedeeld met de horloge-app (één plek die beschrijft hoe de JSON eruitziet)
- [x] Unit tests voor het routemodel en de JSON-(de)serialisatie

## Comments

**2026-11-12 (Claude):**
- **Gebouwd:** `mac/` als Swift Package. `RouteKit` bevat het model, het lezen van knooppuntnummers, de opslag in `~/Library/Application Support/Fietsknooppunten/routes.json` en de `WatchRoute`-encoder. Daarnaast de SwiftUI-app.
- **Routeformaat:** vastgelegd in `docs/route-format.md`.
- **Tests:** 13 tests slagen (`swift test`).
- **Gecontroleerd:** de app start en toont het venster.
- **Nog met de hand te controleren:** toevoegen, herordenen (slepen), verwijderen en hernoemen, en dat de routes na een herstart terug zijn.

**2026-11-12 (Claude):** Na feedback: de selectie is nu zichtbaar en je wijzigt een nummer via dubbelklik in een apart venster. Door de gebruiker getest; werkt.
