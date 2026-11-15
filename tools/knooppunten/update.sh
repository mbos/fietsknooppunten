#!/bin/sh
# Wekelijks (launchd): knooppuntbestand opnieuw bouwen en de webapp uitrollen als het veranderd is.
# Zie tools/knooppunten/README.md.
set -eu
repo=$(cd "$(dirname "$0")/../.." && pwd)
work="$HOME/Library/Caches/Fietsknooppunten/osm"
target="$repo/worker/public/data/knooppunten.json"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

mkdir -p "$(dirname "$target")"
"$repo/tools/knooppunten/build.sh" "$work" "$work/knooppunten.json"

# De datum in het bestand verandert elke keer; vergelijk de rest.
strip() { python3 -I -c 'import json,sys; d=json.load(open(sys.argv[1])); d.pop("date"); print(json.dumps(d))' "$1"; }
if [ -f "$target" ] && [ "$(strip "$work/knooppunten.json")" = "$(strip "$target")" ]; then
    echo "$(date): geen wijzigingen"
    exit 0
fi
cp "$work/knooppunten.json" "$target"
echo "$(date): knooppuntbestand bijgewerkt"
# Alleen uitrollen vanaf een schone main: anders zou werk in uitvoering live gaan.
branch=$(git -C "$repo" rev-parse --abbrev-ref HEAD)
if [ "$branch" != "main" ] || [ -n "$(git -C "$repo" status --porcelain)" ]; then
    echo "$(date): niet uitgerold: repo staat op '$branch' of heeft wijzigingen; draai later opnieuw"
    exit 0
fi
if grep -q '^\[assets\]' "$repo/worker/wrangler.toml"; then
    (cd "$repo/worker" && npx wrangler deploy)
fi
