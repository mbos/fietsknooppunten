# Publiek maken: wat kost het?

Vraag van de maintainer (13-11-2026): kan dit een gratis app voor iedereen worden zonder dat het geld kost? De huidige opzet: een Mac-app, een Cloudflare Worker met KV, en een beta-app op het horloge.

## Conclusie

**Ja, dit kan voor €0 per maand, ook met duizenden gebruikers**, mits:

1. de Mac-app een **statische webapp** wordt;
2. de route-opslag van **KV naar D1** (of een SQLite Durable Object) gaat;
3. de knooppuntdata **vooraf als statisch bestand** klaarstaat, in plaats van dat elke gebruiker Overpass en Nominatim bevraagt.

Het gratis plan van Cloudflare kan je geen rekening sturen. Boven de limiet krijg je een foutmelding (Error 1027 of 429), en om 00:00 UTC begint de teller opnieuw. Het ergste dat gebeurt is dus dat versturen een dag niet werkt. Dan pas zou het betaalde plan ($5 per maand) nodig zijn.

## Kostenposten

| Onderdeel | Nu | Publiek | Kosten |
|---|---|---|---|
| Horloge-app in de Connect IQ Store | beta | gewone publicatie (nieuwe app-ID) | gratis |
| Invoer-app | Mac-app (Swift) | webapp, statisch | gratis (Workers static assets of Pages) |
| Mac-app verspreiden | n.v.t. (eigen gebruik) | vervalt | een Mac-app voor anderen vraagt een Apple Developer-account (€99 per jaar) voor notarisatie; een webapp niet |
| Route-opslag | Worker + KV | Worker + D1 | gratis binnen de limieten hieronder |
| Knooppuntdata | Overpass live, per gebruiker | statisch bestand, bijvoorbeeld wekelijks bijgewerkt | gratis |
| Plaatsnaam zoeken | Nominatim live | lijst plaatsen in hetzelfde bestand, of op de kaart klikken | gratis |
| Domeinnaam | `*.workers.dev` | subdomein van deboskes.eu (bestaat al) | geen extra kosten |

## Cloudflare: gratis limieten

Bron: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Static assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/).

| Dienst | Gratis per dag | Gebruik per gebruiker per dag (schatting) |
|---|---|---|
| Worker-requests | 100.000 | ~5 (app starten, af en toe "Route ophalen", 1–2 keer versturen) |
| KV writes | **1.000** | 1–2 versturingen |
| KV reads | 100.000 | ~5 |
| D1 rows written | 100.000 | 1–2 |
| D1 rows read | 5.000.000 | ~5 |
| Static assets (webapp, knooppuntdata) | **onbeperkt en gratis** | n.v.t. |

- **De echte bottleneck is KV writes:** bij 1.000 per dag kunnen er per dag maar ongeveer 500–1.000 routes verstuurd worden. Met D1 (of een SQLite Durable Object, ook gratis: 100.000 rows written per dag) wordt dat 100× ruimer.
- **Requests:** met ~5 per gebruiker per dag is 100.000 genoeg voor ~20.000 actieve gebruikers per dag. Dat ligt ver boven wat een niche-app als deze haalt.
- **Static assets:** de webapp en het knooppuntbestand tellen niet mee voor de request-limiet ("Requests to static assets are free and unlimited").

## OpenStreetMap-diensten: het echte risico

Kosten zijn niet het probleem; de gebruiksregels van de gratis OSM-diensten wel.

- **Overpass:**
  - "Setting up an app for more than just OSM mappers and relying on the public instances as backend" noemt Overpass zelf problematisch gebruik ([Overpass commons](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html)).
  - Een publieke app mag dus niet per gebruiker live Overpass bevragen, zoals de Mac-app nu doet.
- **Nominatim:**
  - Mag voor een app met "moderate" aantallen gebruikers, met maximaal 1 request per seconde voor de hele app samen.
  - Verplicht zijn caching, een eigen User-Agent of Referer, en attributie.
  - De dienst moet uit te zetten zijn zonder app-update ([Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/)).
  - Elke browser van een gebruiker doet zijn eigen verzoeken, dus dat beheer je slecht.

**Oplossing: knooppuntdata vooraf ophalen.**
- **Ophalen:** een geplande taak (bijvoorbeeld een gratis GitHub Action, wekelijks) haalt één keer alle knooppunten van Nederland en België op, met nummer, positie en verbindingen (`ref=mm-nn`).
- **Publiceren:** de taak zet dat als statisch JSON-bestand bij de webapp.
- **In de webapp:** de webapp zoekt en kiest (de bestaande Viterbi-logica) volledig in de browser.
- **Plaatsnamen:** die kunnen in hetzelfde bestand, als lijst met woonplaatsen en hun positie.
- **Grootte:** niet gemeten; de Overpass-query voor heel NL+BE kwam niet door. De schatting is enkele duizenden knooppunten, dus honderden KB, en gecomprimeerd minder.
- **Licentie:** het bestand is een afgeleide database van OSM. Dat vraagt ODbL-attributie en share-alike, en het bestand moet onder ODbL beschikbaar zijn.

## Wat moet er gebouwd worden?

1. **Horloge:**
   - een nieuwe app-ID voor de publieke versie;
   - het serveradres blijft vast in de app;
   - het type van de sleutel-setting blijft.
2. **Koppelcode per gebruiker** in plaats van één `API_KEY` (eerder besproken bij ticket 04):
   - De webapp maakt een willekeurige code, bijvoorbeeld 16 tekens.
   - De Worker bewaart de route onder een hash van die code.
   - Er is geen account nodig.
   - Een rate limit per IP-adres tegen misbruik: de [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/). Of die op het gratis plan zit, staat niet in de documentatie, dus dat moet nog uitgezocht worden.
   - Als alternatief kan de Worker per code het aantal schrijfacties per dag zelf in D1 bijhouden.
3. **Opslag naar D1:** een tabel `routes(code_hash, json, updated_at)`. Oude routes (bijvoorbeeld 90 dagen ongebruikt) worden opgeruimd met een gratis Cron Trigger.
4. **Webapp:**
   - De logica van RouteKit (GPX-import, clusteren, Viterbi, vereenvoudigen, afslagen) wordt naar TypeScript overgezet, of naar WebAssembly vanuit Swift (complexer).
   - Er komt een eenvoudige kaart bij. Let op: de gratis tegels van openstreetmap.org hebben ook een gebruiksbeleid. Een webapp zonder kaart (nummers + plaats + GPX) heeft dat probleem niet.
5. **Knooppuntexport:** een script plus een geplande taak die het statische bestand maakt.
6. **Privacy:** routes laten zien waar iemand fietst. Er moet een korte privacyverklaring komen: wat er bewaard wordt, hoe lang, en geen tracking. De koppelcode is het enige "account".

## Open punten

- Is de Rate Limiting binding beschikbaar op het gratis plan? Is de daglimiet van D1 per account of per database? (Volgens de pricing-pagina geldt hij per account.)
- Hoe groot wordt het knooppuntbestand voor NL+BE? Dat moet gemeten worden met een export op een rustig moment, of via een Geofabrik-extract.
- Welke voorwaarden stelt de Connect IQ Store aan een gratis app die een eigen server gebruikt (privacyverklaring, permissie-uitleg)? Dat is nog niet onderzocht.

## Vervolgonderzoek (ticket 02, 13-11-2026)

### Cloudflare

- **Custom Domain op deboskes.eu:**
  - In `wrangler.toml` zet je `[[routes]] pattern = "fietsknooppunten.deboskes.eu"` met `custom_domain = true`. Daarna `wrangler deploy`.
  - Cloudflare maakt zelf het DNS-record en het certificaat aan.
  - Voorwaarde: op die hostnaam staat nog geen CNAME ([Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)).
  - De documentatie noemt geen kosten. De pricing-pagina noemt Custom Domains niet als betaalde functie.
- **D1 bij overschrijding:**
  - Boven de daglimiet geven queries een fout ("daily limit exceeded"); je krijgt geen rekening. De teller begint om 00:00 UTC opnieuw ([D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)).
  - Opslag (5 GB) geldt voor alle databases in het account samen.
  - Of de limieten voor rijen per dag per account of per database gelden, staat er **niet**. Voor één database maakt dat niet uit.
- **Rate Limiting binding:** in de documentatie staat **niets** over beschikbaarheid of prijs per plan ([Rate Limit](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [pricing](https://developers.cloudflare.com/workers/platform/pricing/)).
  - **Besluit voor ticket 03:** zelf tellen in D1, per code en per IP-adres per dag. Dat werkt zeker op het gratis plan.
  - Elke telling is een geschreven rij, dus 2 extra writes per verzending. Dat valt ruim binnen 100.000 per dag.

### Connect IQ Store

- **Indienen** ([Submit an App](https://developer.garmin.com/connect-iq/submit-an-app/)):
  1. Exporteer een `.iq` met alle toestellen uit het manifest.
  2. Upload het bestand.
  3. Na de validatie voeg je de beschrijving en screenshots toe.
  4. Garmin beoordeelt de app. Je kunt hem zelf al downloaden; hij verschijnt pas in de store na goedkeuring.
- **Review-richtlijnen:** [App Review Guidelines](https://developer.garmin.com/connect-iq/app-review-guidelines/) is een JavaScript-pagina en was **niet uit te lezen**. Een eis voor een privacyverklaring is dus **niet geverifieerd**.
  - Op het [forum](https://forums.garmin.com/developer/connect-iq/f/discussion/380558/privacy-policy) noemen ontwikkelaars (niet Garmin) een pagina die uitlegt wat er met de data gebeurt, wanneer data naar een server gaat.
  - **Besluit:** maak sowieso een privacyverklaring (ticket 04) en link ernaar in de beschrijving.
  - Lees bij het indienen (ticket 07) de richtlijnen in de browser na.

### Toestellen

Volgens de SDK-device-bestanden ondersteunen 176 toestellen een watch-app, waarvan 89 met Connect IQ ≥ 5.0. Dat is de `minApiLevel` van de app.

- **De bediening vraagt UP, DOWN en START als fysieke knoppen.** Dat sluit de volgende groepen uit:
  - **Venu en vivoactive:** twee knoppen, bediening vooral met touch. Het touchscreen is in deze app bewust uitgeschakeld.
  - **Edge-fietscomputers:** rechthoekig scherm, andere bediening en een eigen navigatie. Mogelijk later.
- **Aanbevolen (rond, 5 knoppen, GPS, CIQ ≥ 5):**
  - **Forerunner** 165, 170, 255, 265, 570, 955, 965, 970;
  - **fēnix** 7, 8, 9 (alle varianten), **epix** 2 (Pro), **enduro** 3 en 4;
  - **Instinct** 3 AMOLED en Crossover AMOLED, **MARQ** 2 en 3;
  - **quatix** en **D2:** kunnen ook, maar zijn een niche.
- **Schermen:** van 218×218 (fr255s, MIP) tot 466×466 (fēnix 9 Pro 51 mm). De layout van de view rekent al met verhoudingen. Drie maten zijn nog vaste pixels:
  - de randpijl (40/22 px);
  - het afslagsymbool (40 px, lijndikte 6);
  - de voortgangsboog (lijndikte 8).
  
  Die moeten meeschalen (ticket 07).
- **MIP-schermen** (fēnix 7, FR 255/955): kleuren en contrast zijn anders dan op AMOLED. Controleer de leesbaarheid in de simulator.
- **Instinct (semi-octagon, 176 px):** een te klein en afwijkend scherm voor het grote nummer met de pijl. Voorlopig niet.
