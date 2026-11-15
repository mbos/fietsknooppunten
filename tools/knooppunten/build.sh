#!/bin/sh
# Maakt knooppunten.json voor Nederland en België uit Geofabrik-extracten.
# Gebruik: tools/knooppunten/build.sh <werkmap> <uitvoerbestand> [regio ...]
# Standaardregio's: europe/netherlands europe/belgium. Vereist: curl, osmium-tool, python3.
set -eu
work=$1; out=$2; shift 2
regions=${*:-"europe/netherlands europe/belgium"}
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$work"
opls=""
for region in $regions; do
    name=$(basename "$region")
    pbf="$work/$name.osm.pbf"
    # Alleen opnieuw downloaden als Geofabrik een nieuwere versie heeft.
    curl -sSfL -z "$pbf" -o "$pbf" "https://download.geofabrik.de/$region-latest.osm.pbf"
    osmium tags-filter "$pbf" n/rcn_ref r/network=rcn n/place=city,town,village -o "$work/$name.f.pbf" -O
    osmium add-locations-to-ways "$work/$name.f.pbf" -o "$work/$name.l.pbf" -O
    osmium cat "$work/$name.l.pbf" -f opl,locations_on_ways=true -o "$work/$name.opl" -O
    opls="$opls $work/$name.opl"
done
# shellcheck disable=SC2086
python3 -I "$here/build.py" $opls > "$out"
ls -l "$out"
