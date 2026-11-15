# Publieke, gratis versie

**Doel:** iedereen kan de horloge-app gratis gebruiken, en het kost de maintainer niets (€0 per maand). Onderbouwing: `docs/research/publiek-kosten.md`.

**Opzet:**
- **Webapp (statisch):** vervangt de Mac-app voor andere gebruikers.
- **Worker met D1:** bewaart de routes. Elke gebruiker krijgt een eigen koppelcode.
- **Knooppuntdata:** een statisch bestand, dat een geplande taak bijwerkt.
- **Horloge-app:** de gewone, publieke versie in de Connect IQ Store, met een nieuwe app-ID.

Alles blijft binnen het gratis plan van Cloudflare. Boven de limieten krijg je een foutmelding, geen rekening.

**Randvoorwaarden:**
- **Geen live Overpass of Nominatim per gebruiker.** Hun gebruiksbeleid staat dat niet toe.
- **Licentie:** de OSM-data valt onder ODbL. Dat betekent attributie en share-alike voor het knooppuntbestand.
- **Geen accounts en geen tracking.** De koppelcode is het enige wat een gebruiker identificeert.
- **De privé-opzet blijft werken tot de overstap:** de beta-app, de Mac-app en `API_KEY`.

**Besluiten van de maintainer (13-11-2026):**
- **Domein:** de webapp komt op een domein van de maintainer onder **deboskes.eu**, bijvoorbeeld `fietsknooppunten.deboskes.eu`. Er komen geen extra kosten bij, want het domein bestaat al.
  - De DNS van deboskes.eu staat al bij Cloudflare, dus een Custom Domain voor de Worker kan direct.
- **Geen eigen kaart.** Voor het plannen van een route verwijst de webapp naar de **ANWB Fietsknooppuntenplanner**. Daar maak je de route en exporteer je hem als GPX (zoals `lokaal.gpx`), die je daarna importeert (ticket 05).
  - Dat werkt al zo: `lokaal.gpx` is een export van de ANWB-planner. Adres van de planner: https://www.anwb.nl/fietsroutes/fietsknooppuntenplanner.
  - Het tegelbeleid van OSM speelt hierdoor niet meer.

- **De webapp vervangt de Mac-app,** ook voor de maintainer zelf.
  - Na de overstap (ticket 07) kan `mac/` weg. De Swift-logica in RouteKit is dan alleen nog de referentie voor de TypeScript-versie (tickets 05 en 06).
  - Ook de privé-beta, de `API_KEY` en de KV-opslag kunnen dan weg.

**Tickets:** `issues/01`–`07`.

**Status (13-11-2026):** alle tickets 01–07 zijn klaar. De horloge-app is goedgekeurd en sinds 14-11-2026 gepubliceerd in de Connect IQ Store, en de privé-opzet is opgeruimd.
