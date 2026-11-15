# Worker: webapp en routes naar het horloge

Een Cloudflare Worker op https://fietsknooppunten.deboskes.eu.

- **Webapp:** serveert de webapp uit `public/` als static assets.
- **Routes:** bewaart per **koppelcode** één route, in D1 (ticket publiek/03).

`workers.dev` staat uit.

| Verzoek | Wie | Wat |
|---|---|---|
| `PUT /route` | webapp | Route opslaan, in het formaat van `docs/route-format.md`. De Worker controleert het formaat en accepteert maximaal 16 KB. |
| `GET /route` | horloge | Route ophalen: bij het starten, na een wijziging in de instellingen, of via "Route ophalen". |

Beide vragen de header `Authorization: Bearer <koppelcode>` mee.

- **Koppelcode:** 16 tekens uit `abcdefghjkmnpqrstuvwxyz23456789`. Hoofdletters, spaties en streepjes tellen niet mee.
- **Foutcodes:**
  - geen of een ongeldige code: `401`;
  - een geldige code zonder route: `404`.
- **Privacy:** in D1 staat alleen de SHA-256 van de code. Het IP-adres van tellers wordt ook gehasht, met het secret `IP_SALT` en de datum.
- **Security:** headers, invoercontrole en de resterende risico's staan in `docs/security.md`.
- **Limieten:** maximaal 50 schrijfacties per code en 200 per IP-adres per UTC-dag. Daarboven `429` met `Retry-After`. Lezen heeft geen limiet.
- **Opruimen:** een Cron Trigger (dagelijks om 03:17 UTC) verwijdert routes die 90 dagen niet verstuurd of opgehaald zijn, en tellers van eerdere dagen.

Alles valt binnen het gratis plan van Cloudflare. Boven de daglimieten krijg je een foutmelding, geen rekening (`docs/research/publiek-kosten.md`).

## Uitrollen

```sh
cd worker
npm install
npx wrangler d1 migrations apply fietsknooppunten --remote   # alleen na een nieuwe migratie
npx wrangler deploy
```

De D1-database (`fietsknooppunten`) staat in `wrangler.toml`. Hij is eenmalig aangemaakt met `wrangler d1 create`. Het knooppuntbestand (`public/data/`) staat niet in git: bouw het eerst met `tools/knooppunten/update.sh`.

## Controleren

```sh
curl -i -H "Authorization: Bearer abcd-efgh-jkmn-pq23" https://fietsknooppunten.deboskes.eu/route
```

Voor een code zonder route geeft dit `404 {"error":"no route"}`.

## Ontwikkelen

- **Tests:** `npm test`.
- **Testroute van het horloge:** `npm run watch-route` maakt `watch/resources/jsonData/route.json` uit `lokaal.gpx`. De tests gebruiken Node met een nep-D1 bovenop `node:sqlite`, met het echte schema uit `migrations/`.
- **Lokaal:** `npx wrangler dev`.
