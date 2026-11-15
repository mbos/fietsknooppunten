# 02: Onderzoek: voorwaarden Connect IQ Store en de gratis limieten van Cloudflare

**What to build:** Onderzoek met primaire bronnen, vastgelegd in `docs/research/publiek-kosten.md`:
- Wat vraagt de Connect IQ Store van een gratis publieke app die een eigen server gebruikt? Denk aan een privacyverklaring, uitleg bij permissies (Communications, Positioning, Fit), het reviewproces, de minimale gegevens voor de vermelding, en ondersteuning van meer toestellen dan de fr970.
- Is de Rate Limiting binding van Cloudflare beschikbaar op het gratis plan?
- Gelden de daglimieten van D1 per account of per database?
- Hoe koppel je een Worker met static assets aan een subdomein van **deboskes.eu**? De DNS staat al bij Cloudflare. Kies tussen een Custom Domain en een route, en zoek uit of het iets kost.

**Blocked by:** None

**Status:** done

- [x] Elke vraag is beantwoord met een bron, of gemarkeerd als "niet gevonden"
- [x] Aanbeveling: welke toestellen naast de fr970 meenemen, gezien het schermformaat en de API-versie
- [x] Gevolgen voor tickets 03, 04 en 07 bijgewerkt

## Comments

**2026-11-13 (Claude):** De uitkomsten staan in `docs/research/publiek-kosten.md`, onder "Vervolgonderzoek".
- **Custom Domain:** dat kan direct met `custom_domain = true`; Cloudflare maakt DNS en certificaat zelf aan.
- **Rate Limiting binding:** de documentatie zegt niet of die op het gratis plan zit. Ticket 03 telt daarom zelf in D1.
- **Store-richtlijnen:** niet uit te lezen (een JavaScript-pagina), dus niet geverifieerd. Er komt sowieso een privacyverklaring.
- **Toestellen:** ronde horloges met 5 knoppen en CIQ 5 of hoger (Forerunner, fēnix, epix, enduro, Instinct AMOLED, MARQ). Geen Venu, vivoactive of Edge.
