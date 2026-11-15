# 03: Worker: koppelcode per gebruiker, opslag in D1, bescherming tegen misbruik

**What to build:** De Worker wordt geschikt voor veel gebruikers.
- **Koppelcode:** elke gebruiker heeft een eigen, willekeurige koppelcode, bijvoorbeeld 16 tekens in groepjes, zonder tekens die op elkaar lijken. De route wordt bewaard onder een hash van die code. Het gedeelde `API_KEY` voor de privé-app blijft werken tot de overstap.
- **Opslag:** van KV naar D1. KV heeft gratis maar 1.000 schrijfacties per dag, D1 100.000.
- **Misbruik:** een limiet op het aantal schrijfacties per code en per IP-adres. Houd de tellingen zelf bij in D1 (ticket 02).
- **Opruimen:** een gratis Cron Trigger verwijdert routes die 90 dagen niet zijn opgehaald.

**Blocked by:** None. Volgens ticket 02 tel je zelf in D1, omdat niet bekend is of de Rate Limiting binding op het gratis plan zit.

**Status:** done

- [x] `PUT /route` en `GET /route` werken met `Authorization: Bearer <koppelcode>`. Een code met verkeerde opmaak of te weinig willekeur wordt geweigerd.
- [x] Twee codes zien elkaars route niet. In D1 staat geen code in leesbare vorm.
- [x] Limiet: bijvoorbeeld maximaal 50 schrijfacties per code per dag, en een limiet per IP-adres. Daarboven `429`, met een nette melding in de webapp en op het horloge.
- [x] De opschoontaak werkt, en is getest met een nep-tijd.
- [x] Het bestaande `API_KEY` werkt nog, en de privé-route wordt overgezet.
- [x] Node-tests voor alle bovenstaande punten. Uitgerold. (De oude KV wordt pas na de overstap opgeruimd, in ticket 07.)

## Comments

**2026-11-13 (Claude):**
- **Koppelcode:**
  - 16 tekens uit 31 tekens zonder i, l, o, 0 en 1, wat neerkomt op ongeveer 79 bits.
  - Hoofdletters, spaties en streepjes tellen niet mee.
  - In D1 staat alleen SHA-256(`code:<code>`).
- **D1:** de tabellen `routes` en `counters` (`worker/migrations/0001_init.sql`).
  - Een GET werkt `fetched_at` hooguit één keer per dag bij, zodat er niet bij elke start van het horloge geschreven wordt.
- **Limieten:** 50 schrijfacties per code en 200 per IP-adres (gehasht) per UTC-dag, bijgehouden in D1. Kosten: 2 extra writes per PUT.
- **Opruimen:** een Cron Trigger draait elke dag om 03:17 UTC en verwijdert routes die 90 dagen niet verstuurd of opgehaald zijn.
- **Overgang:**
  - Het oude `API_KEY` werkt nog als code.
  - Bij de eerste GET met die sleutel wordt de route uit KV naar D1 overgezet. Dat is nog niet gebeurd: D1 telt 0 routes.
  - De Mac-app en de beta-app werken ongewijzigd.
- **Tests:** 15 Node-tests, met een nep-D1 bovenop `node:sqlite` en het echte schema.
- **Uitgerold:** de D1-database `fietsknooppunten` is aangemaakt en de migratie is toegepast.
  - **Live getest** met een wegwerpcode: zonder code `401`, voor het versturen `404`, PUT `200`, en GET `200`, ook met de code in hoofdletters en met spaties.
  - De testroute is daarna verwijderd.
- **Nog te doen door de maintainer:** op het horloge "Route ophalen". Dan blijkt of de oude sleutel werkt, en wordt de route naar D1 overgezet.

**2026-11-13 (Claude):** De maintainer meldt dat het werkt: het horloge haalt de route op met de oude sleutel, via D1.
