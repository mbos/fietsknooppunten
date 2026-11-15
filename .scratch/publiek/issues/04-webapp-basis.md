# 04: Webapp: route invoeren en versturen met een koppelcode

**What to build:** Een statische webapp, geserveerd als Workers static assets (gratis en onbeperkt).
- Je kunt een route handmatig invoeren: naam en nummers, met wijzigen, verwijderen en herordenen, zoals in de Mac-app.
- Bij het eerste bezoek maakt de webapp een koppelcode. Die bewaart hij lokaal in de browser, en hij laat duidelijk zien hoe je de code invult in Garmin Connect.
- Je kunt een route versturen naar de Worker (ticket 03).
- Routes worden lokaal in de browser bewaard: geen account.
- Er komt een korte privacyverklaring (wat er bewaard wordt, hoe lang, geen tracking) en ODbL-attributie.
- De webapp draait op een subdomein van **deboskes.eu**, bijvoorbeeld `fietsknooppunten.deboskes.eu` (besluit van de maintainer). Er komt **geen kaart**. Een duidelijke link naar de ANWB Fietsknooppuntenplanner legt uit hoe je daar een route plant en als GPX exporteert.

**Blocked by:** 03

**Status:** done

- [x] Werkt op desktop en telefoon (zonder kaart)
- [x] Bereikbaar via het subdomein op deboskes.eu, met HTTPS
- [x] Link naar de ANWB Fietsknooppuntenplanner (https://www.anwb.nl/fietsroutes/fietsknooppuntenplanner), met een korte uitleg "plan je route, exporteer als GPX, importeer hier"
- [x] De koppelcode is op een tweede apparaat in te vullen (bv. "deze code ook gebruiken"), zodat je dezelfde code houdt
- [x] Versturen is pas mogelijk als alle knooppunten een locatie hebben. Tot ticket 06 klaar is, betekent dat: alleen GPX-routes
- [x] Logica en tests (JavaScript met JSDoc-types in plaats van TypeScript, zie comment). De gedeelde logica (routeformaat, nummers parsen) heeft dezelfde testgevallen als RouteKit
- [x] Privacyverklaring en attributie zijn bereikbaar via een vaste URL, die ticket 07 nodig heeft voor de store-vermelding

## Comments

**2026-11-13 (Claude):**
- **Live:** https://fietsknooppunten.deboskes.eu, als static assets van dezelfde Worker. `/route` gaat naar de Worker, de rest naar `worker/public/`.
- **Pagina's:**
  - De koppelcode wordt bij het eerste bezoek gemaakt en in localStorage bewaard. Er is een kopieerknop, en via "Andere code gebruiken" vul je een bestaande code in.
  - De routelijst en de editor bewaren alles in localStorage. In de editor kun je de naam wijzigen, nummers toevoegen, een nummer inline aanpassen, stappen verplaatsen (↑↓) en verwijderen. Een route verwijderen vraagt een tweede klik, zonder browserdialoog.
  - Versturen geeft een bevestiging of een foutmelding in het Nederlands.
  - Een blok met een link naar de ANWB-planner, de privacypagina (`privacy.html`) en de ODbL-attributie.
- **Afwijking van de brief:** de code is **JavaScript met JSDoc-types** (`// @ts-check`), geen TypeScript. Zo heeft de site geen build-stap nodig, en draaien de tests direct met Node.
  - De logica staat in `worker/public/lib/`: `numbers`, `route`, `code`, `api` en `storage`.
  - 7 tests met dezelfde gevallen als RouteKit, waaronder byte-gelijke uitvoer met `WatchRoute.encode`. In totaal zijn er 22 Worker-tests.
- **Valkuil bij het uitrollen:** met een `[[routes]]`-regel zet wrangler `workers.dev` standaard uit. Daardoor was het adres voor het horloge en de Mac ongeveer 2 minuten onbereikbaar (404). Nu staat `workers_dev = true` in `wrangler.toml`.
- **Live getest:**
  - Webapp en scripts geven `200`.
  - Een PUT via het eigen domein werkte, en dezelfde route was op te halen via `workers.dev`. De testroute is daarna verwijderd.
- **Nog niet mogelijk:** versturen vanuit de webapp. Handmatige routes hebben pas locaties met ticket 06; tot dan werkt het alleen met een GPX-import (ticket 05). De oude privé-sleutel heeft niet het code-formaat, dus die kun je niet in de webapp invullen. Dat is ook niet nodig: de Mac-app blijft tot de overstap werken.
- **launchd-taak voor het knooppuntbestand (ticket 01):** kan nu geïnstalleerd worden. Wordt pas nuttig bij ticket 06.

**2026-11-13 (Claude):** De maintainer heeft de webapp bekeken: "Ziet er goed uit".
