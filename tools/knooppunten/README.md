# Knooppuntbestand bouwen

Maakt `knooppunten.json` (formaat: `docs/knooppuntbestand.md`) uit OpenStreetMap-extracten van Geofabrik.

Vereist: `osmium-tool` (`brew install osmium-tool` of `apt install osmium-tool`), `curl` en `python3`.

```sh
tools/knooppunten/build.sh <werkmap> <uitvoer.json> [regio ...]   # standaard: NL + BE
python3 -I -m unittest discover -s tools/knooppunten              # tests
```

**Ruimte:** de extracten van NL + BE zijn samen ongeveer 2,1 GB.

## Wekelijks bijwerken (GitHub Actions)

De workflow `.github/workflows/knooppunten.yml` draait elke zondag om 03:00 UTC:
1. Hij bouwt het bestand met `build.sh` uit verse Geofabrik-extracten.
2. Hij vergelijkt het met het bestand op de site, zonder de datum.
3. Alleen als er iets veranderd is, draait hij de tests en rolt hij de Worker uit vanaf `main`.

- **Met de hand starten:** `gh workflow run knooppunten.yml`, of op GitHub via *Actions › Knooppuntbestand › Run workflow*. Met `-f force=true` rolt hij ook uit als de data niet veranderd is.
- **Log:** `gh run list --workflow knooppunten.yml` en `gh run view --log`, of op het tabblad *Actions*.
- **Secrets:** `CLOUDFLARE_API_TOKEN` (sjabloon "Edit Cloudflare Workers") en `CLOUDFLARE_ACCOUNT_ID`, onder *Settings › Secrets and variables › Actions*.
- **Na 60 dagen zonder commits** zet GitHub geplande workflows in openbare repo's uit. Je krijgt dan een mail; zet hem weer aan onder *Actions › Knooppuntbestand › Enable workflow*.

**Let op:** `worker/public/data/knooppunten.json` staat niet in git. Een `wrangler deploy` vanaf je eigen computer rolt het bestand uit dat daar toevallig staat: zonder bestand verdwijnt het van de site, met een oud bestand gaat de data terug in de tijd. Rol een codewijziging daarom liever uit met `gh workflow run knooppunten.yml -f force=true`. Die bouwt eerst een vers bestand.
