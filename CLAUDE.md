# fietsknooppunten

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Project

Drie delen:
- een **webapp** om fietsknooppuntenroutes in te voeren en te versturen (https://fietsknooppunten.deboskes.eu);
- een **Cloudflare Worker** die de webapp serveert en de routes per koppelcode bewaart;
- een **Connect IQ-app** voor Garmin-horloges die de route ophaalt en de knooppunten toont.

Het routeformaat staat in `docs/route-format.md`, het knooppuntbestand in `docs/knooppuntbestand.md` en de beveiliging in `docs/security.md`. De oorspronkelijke Mac-app (Swift) is vervangen door de webapp en staat alleen nog in de git-geschiedenis.

- Webapp en Worker (`worker/`; de webapp staat in `worker/public/`, gewoon JavaScript met JSDoc en zonder build-stap): testen met `cd worker && npm test && npm run typecheck` (ook in CI, `.github/workflows/ci.yml`), uitrollen met `gh workflow run knooppunten.yml -f force=true` (bouwt eerst een vers knooppuntbestand). Zie `worker/README.md`. Secrets (bv. `IP_SALT`) staan alleen in Cloudflare; het Cloudflare-token voor uitrollen staat alleen als GitHub-secret.
- Knooppuntbestand: `tools/knooppunten/`. De GitHub Action `.github/workflows/knooppunten.yml` bouwt het elke zondag opnieuw en rolt het uit als het veranderd is.
- Horloge-app (`watch/`, Monkey C): `make -C watch build`, `make -C watch test` (unit tests in de simulator) en `make -C watch run`. Voor een ander toestel: `DEVICE=fr255s`. De developer key staat in `~/.garmin/developer_key.der` en hoort niet in de repo. Talen: Engels (`resources/`) en Nederlands (`resources-dut/`).
- Horloge-app in de store: app-ID `851dfaf1a887407fae500bacfdad4488` (`watch/manifest.xml`, 48 toestellen). Een nieuwe versie maak je met `make -C watch package`. De teksten voor de store staan in `docs/store/beschrijving.md`. Store-pagina: https://apps.garmin.com/apps/421c9b52-f51b-4a20-9c93-7f7fe1f53b1e.
- Publieke versie: spec en tickets in `.scratch/publiek/`.
- Store-plaatje: `docs/store/knooppunt-500.png`, gemaakt met `docs/store/maak-bordje.swift`.
- Open source: code onder `GPL-3.0-or-later` (`LICENSE`), knooppuntdata onder ODbL. De publieke uitleg staat in `README.md`, het melden van kwetsbaarheden in `SECURITY.md`. Zet nooit secrets, developer keys of persoonlijke gegevens in de repo.
