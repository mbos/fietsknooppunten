#!/usr/bin/env python3
"""Maakt het statische knooppuntbestand voor de webapp (ticket publiek/01).

Leest OPL (uitvoer van osmium, zie build.sh) van stdin of uit bestanden, en schrijft
compacte JSON naar stdout. Formaat: docs/knooppuntbestand.md.

Data © OpenStreetMap-bijdragers, ODbL 1.0.
"""
import datetime
import json
import re
import sys

SCALE = 100_000
PLACES = {"city", "town", "village"}


def unescape(text):
    # OPL codeert speciale tekens als %hex%.
    return re.sub(r"%([0-9a-fA-F]+)%", lambda m: chr(int(m.group(1), 16)), text)


def tags(field):
    result = {}
    if field:
        for pair in field.split(","):
            key, _, value = pair.partition("=")
            result[unescape(key)] = unescape(value)
    return result


def number(ref):
    """'05' -> 5; alleen 1..99, net als JunctionNumber.parse."""
    if ref is None or not re.fullmatch(r"0*\d{1,2}", ref.strip()):
        return None
    n = int(ref)
    return n if 1 <= n <= 99 else None


def parse(lines):
    junctions, places, relations, ways = [], [], [], {}
    for line in lines:
        fields = {f[0]: f[1:] for f in line.rstrip("\n").split(" ") if f}
        kind, t = line[0], tags(fields.get("T", ""))
        if kind == "n":
            if "x" not in fields or not fields["x"]:
                continue
            lat, lon = float(fields["y"]), float(fields["x"])
            if t.get("network:type") == "node_network" and (n := number(t.get("rcn_ref"))):
                junctions.append([n, round(lat * SCALE), round(lon * SCALE)])
            if t.get("place") in PLACES and (name := t.get("name:nl") or t.get("name")):
                places.append([name, round(lat * SCALE), round(lon * SCALE)])
        elif kind == "w":
            # Met add-locations-to-ways: n123x5.1y51.2,n124x...
            points = re.findall(r"x(-?[\d.]+)y(-?[\d.]+)", fields.get("N", ""))
            if points:
                x, y = points[len(points) // 2]
                ways[fields["w"] if "w" in fields else line[1:].split(" ")[0]] = (float(y), float(x))
        elif kind == "r":
            if t.get("route") != "bicycle" or t.get("network") != "rcn":
                continue
            parts = (t.get("ref") or "").split("-")
            if len(parts) != 2 or not (a := number(parts[0])) or not (b := number(parts[1])):
                continue
            members = [m.split("@")[0][1:] for m in fields.get("M", "").split(",") if m.startswith("w")]
            relations.append((min(a, b), max(a, b), members))
    connections = set()
    for a, b, members in relations:
        # Eén punt op de verbinding: het midden van de middelste weg die we kennen.
        known = [ways[m] for m in members if m in ways]
        if known:
            lat, lon = known[len(known) // 2]
            connections.add((a, b, round(lat * SCALE), round(lon * SCALE)))
    return sorted(set(map(tuple, junctions))), sorted(set(map(tuple, places))), sorted(connections)


def main():
    files = sys.argv[1:] or ["-"]
    lines = []
    for name in files:
        lines.extend(sys.stdin if name == "-" else open(name, encoding="utf-8"))
    junctions, places, connections = parse(lines)
    out = {
        "v": 1,
        "date": datetime.date.today().isoformat(),
        "license": "ODbL 1.0, https://opendatacommons.org/licenses/odbl/",
        "attribution": "© OpenStreetMap-bijdragers, https://www.openstreetmap.org/copyright",
        "j": [list(j) for j in junctions],
        "c": [list(c) for c in connections],
        "p": [list(p) for p in places],
    }
    json.dump(out, sys.stdout, ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
