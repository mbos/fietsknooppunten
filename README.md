# Fietsknooppunten

Fiets langs fietsknooppunten in Nederland en België zonder op een kaart of je telefoon te kijken. Je zet een route klaar in de webapp, en een Garmin-horloge toont onderweg het knooppunt waar je naartoe fietst.

- **Webapp:** https://fietsknooppunten.deboskes.eu
- **Horloge-app:** [Knooppunten in de Connect IQ Store](https://apps.garmin.com/apps/421c9b52-f51b-4a20-9c93-7f7fe1f53b1e)

> **In English:** a web app and a Garmin Connect IQ watch app for the Dutch and Belgian cycling junction network (*fietsknooppunten*). You enter or import a route in the web app and send it to your watch with a pairing code. The watch shows the next junction in large digits, advances automatically when you arrive, and gives turn-by-turn hints when the route comes from a GPX file. The code and docs are mostly in Dutch; the apps themselves are in Dutch and English. Licensed under GPL-3.0-or-later; junction data © OpenStreetMap contributors (ODbL).

## Hoe het werkt

1. In de **webapp** typ je de knooppuntnummers in, of je importeert een GPX-export van de [ANWB Fietsknooppuntenplanner](https://www.anwb.nl/fietsroutes/fietsknooppuntenplanner). De webapp zoekt de knooppunten op in een knooppuntbestand uit OpenStreetMap, helemaal in de browser.
2. De webapp maakt een willekeurige **koppelcode**. Die vul je één keer in bij de instellingen van de horloge-app in Garmin Connect.
3. Met "Verstuur naar horloge" gaat de route naar een **Cloudflare Worker**. Het horloge haalt hem daar op met dezelfde code en bewaart hem, zodat hij ook zonder verbinding werkt.

Er is geen account, er zijn geen advertenties en er is geen tracking. Zie de [privacyverklaring](https://fietsknooppunten.deboskes.eu/privacy.html).

## Onderdelen

| Map | Wat | Techniek |
|---|---|---|
| `worker/public/` | webapp | gewoon JavaScript met JSDoc, zonder build-stap en zonder runtime-dependencies |
| `worker/src/` | API die routes per koppelcode bewaart (`PUT`/`GET /route`) | Cloudflare Worker met D1 |
| `watch/` | horloge-app, 48 toestellen | Monkey C (Connect IQ) |
| `tools/knooppunten/` | bouwt het knooppuntbestand uit OpenStreetMap | `osmium` en Python |
| `docs/` | formaten, beveiliging, onderzoek en store-teksten | |

Documentatie:
- [`docs/route-format.md`](docs/route-format.md): het routeformaat tussen webapp, Worker en horloge;
- [`docs/knooppuntbestand.md`](docs/knooppuntbestand.md): het knooppuntbestand;
- [`docs/security.md`](docs/security.md): beveiliging en resterende risico's;
- [`worker/README.md`](worker/README.md): de API, limieten en uitrollen;
- [`tools/knooppunten/README.md`](tools/knooppunten/README.md): het knooppuntbestand bouwen;
- [`docs/research/`](docs/research/): het technologie-onderzoek, batterijgebruik en kosten.

`.scratch/` en `.out-of-scope/` bevatten de tickets en de specificatie waarmee het project is gebouwd; het zijn werknotities. Afspraken voor AI-codeerassistenten staan in `CLAUDE.md` en `docs/agents/`.

`lokaal.gpx` is een voorbeeldroute (een export uit de ANWB-planner rond Rosmalen). De tests en de testroute van het horloge gebruiken hem.

## Ontwikkelen

### Webapp en Worker

Vereist: Node.js 22.23 of nieuwer (de tests gebruiken `node:sqlite`; oudere versies van Node 22 hebben daarin fouten).

```sh
cd worker
npm install
npm test            # unit tests, een nep-D1 en een paginatest in jsdom
npx wrangler dev    # lokaal draaien
```

De webapp heeft het knooppuntbestand nodig in `worker/public/data/knooppunten.json`. Dat staat niet in git; bouw het met de tool hieronder.

### Knooppuntbestand

Vereist: `osmium-tool` (`brew install osmium-tool`), `curl` en `python3`.

```sh
tools/knooppunten/build.sh /tmp/osm worker/public/data/knooppunten.json   # standaard NL + BE
python3 -I -m unittest discover -s tools/knooppunten                      # tests
```

### Horloge-app

Vereist: de [Connect IQ SDK](https://developer.garmin.com/connect-iq/sdk/) via de SDK Manager, en een eigen developer key in `~/.garmin/developer_key.der` (maak die met de SDK; hij hoort nooit in git).

```sh
make -C watch build              # bin/knooppunten.prg, ook om te sideloaden
make -C watch test               # unit tests in de simulator
make -C watch run                # starten in de simulator, met een ingebouwde testroute
DEVICE=fr255s make -C watch run  # ander toestel
```

Talen: Engels (`watch/resources/`) en Nederlands (`watch/resources-dut/`).

## Zelf een eigen versie draaien

De code verwijst naar de officiële installatie. Voor een eigen versie pas je het volgende aan:

1. **`worker/wrangler.toml`:** je eigen domein onder `[[routes]]`, en een eigen D1-database. Maak die met `npx wrangler d1 create fietsknooppunten` en zet de nieuwe `database_id` in het bestand. Daarna `npx wrangler d1 migrations apply fietsknooppunten --remote`.
2. **Secret `IP_SALT`:** een willekeurige waarde, alleen in Cloudflare: `npx wrangler secret put IP_SALT`. Daarmee worden IP-adressen voor de schrijflimiet gehasht (zie `docs/security.md`).
3. **`watch/source/RouteSource.mc`:** `WORKER_URL` naar je eigen domein.
4. **`watch/manifest.xml`:** een eigen app-ID. Het huidige ID hoort bij de app in de store; gebruik het niet voor een andere app.
5. **`.github/workflows/knooppunten.yml`:** `LIVE_URL` naar je eigen domein, en de secrets `CLOUDFLARE_API_TOKEN` en `CLOUDFLARE_ACCOUNT_ID` in je eigen repo. Die workflow bouwt het knooppuntbestand en rolt uit.
6. **Webapp:** de privacyverklaring (`worker/public/privacy*.html`) gaat over de officiële dienst. Pas die aan je eigen installatie aan.

## Licentie

- **Code:** [GNU General Public License v3.0 of later](LICENSE) (`GPL-3.0-or-later`). Je mag de code gebruiken, aanpassen en verspreiden. Verspreid je een aangepaste versie, ook van de horloge-app, dan valt die ook onder de GPL en lever je de broncode mee.
- **Knooppuntdata:** © [OpenStreetMap-bijdragers](https://www.openstreetmap.org/copyright), onder de [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/). Dat geldt voor het knooppuntbestand dat `tools/knooppunten/` bouwt. Wie dat bestand verspreidt, vermeldt OpenStreetMap; de webapp doet dat in de voettekst en op de privacypagina.
- **Merken:** "Garmin" en "Connect IQ" zijn merken van Garmin; "ANWB" van de ANWB. Dit project is daar niet aan verbonden. De webapp linkt alleen naar de ANWB-planner.
- **Afhankelijkheden:** alleen voor ontwikkelen (`wrangler`, `jsdom`), met MIT-, Apache-2.0-, BSD- en LGPL-licenties. Ze worden niet met de webapp of de horloge-app meegeleverd.

## Beveiliging

Een kwetsbaarheid gevonden? Meld die privé; zie [`SECURITY.md`](SECURITY.md).
