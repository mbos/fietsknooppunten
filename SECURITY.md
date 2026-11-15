# Beveiliging

## Een kwetsbaarheid melden

Meld een kwetsbaarheid **privé**, niet in een openbaar issue. Gebruik daarvoor **"Report a vulnerability"** op het tabblad *Security* van deze repository (GitHub private vulnerability reporting).

Vermeld:
- welk onderdeel het betreft (webapp, Worker op https://fietsknooppunten.deboskes.eu, of de horloge-app);
- hoe je het probleem kunt nadoen;
- wat een aanvaller ermee kan.

Dit is een hobbyproject van één maintainer. Je krijgt zo snel mogelijk een reactie, meestal binnen een week. Na een oplossing wordt de melding openbaar gemaakt, met vermelding van de melder als die dat wil.

## Wat telt

Wel:
- routes van een ander lezen of overschrijven zonder diens koppelcode;
- XSS, injectie of het omzeilen van de Content-Security-Policy in de webapp;
- het omzeilen van de groottelimiet of de schrijflimieten van de Worker;
- het herleiden van koppelcodes of IP-adressen uit wat de Worker opslaat.

Niet:
- het opmaken van het gratis dagquotum van Cloudflare met veel requests (bekend risico, zie `docs/security.md`);
- toegang via een koppelcode die de eigenaar zelf heeft gedeeld;
- problemen in de Garmin-, ANWB- of Cloudflare-diensten zelf. Meld die bij de betreffende partij.

Doe geen geautomatiseerde scans of belastingtests op de officiële installatie. Test liever lokaal met `npx wrangler dev` (zie `worker/README.md`).

## Ontwerp

De maatregelen en de resterende risico's staan in [`docs/security.md`](docs/security.md).
