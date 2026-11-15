"""Tests voor build.py: python3 -I -m unittest discover -s tools/knooppunten"""
import io
import json
import os
import sys
import unittest
from contextlib import redirect_stdout

sys.path.insert(0, os.path.dirname(__file__))
import build  # noqa: E402

OPL = """\
n1 v1 dV c0 t2026-01-01T00:00:00Z i0 u Tnetwork:type=node_network,rcn_ref=05 x5.3331197 y51.6541132
n2 v1 dV c0 t2026-01-01T00:00:00Z i0 u Tnetwork:type=node_network,rcn_ref=05 x5.3331197 y51.6541132
n3 v1 dV c0 t2026-01-01T00:00:00Z i0 u Tnetwork:type=node_network,rcn_ref=140 x5.0 y51.0
n4 v1 dV c0 t2026-01-01T00:00:00Z i0 u Trcn_ref=7 x5.0 y51.0
n5 v1 dV c0 t2026-01-01T00:00:00Z i0 u Tname=Rosmalen,place=village x5.3629244 y51.71866
n6 v1 dV c0 t2026-01-01T00:00:00Z i0 u Tname=Bruxelles%20%-%20%Brussel,name:nl=Brussel,place=city x4.35 y50.85
n7 v1 dV c0 t2026-01-01T00:00:00Z i0 u Tname=Ergens,place=hamlet x4.0 y50.0
w10 v1 dV c0 t2026-01-01T00:00:00Z i0 u Thighway=cycleway Nn11x5.30y51.60,n12x5.31y51.61,n13x5.32y51.62
r20 v1 dV c0 t2026-01-01T00:00:00Z i0 u Tnetwork=rcn,ref=40-21,route=bicycle,type=route Mw10@,w99@
r21 v1 dV c0 t2026-01-01T00:00:00Z i0 u Tnetwork=lcn,ref=1-2,route=bicycle,type=route Mw10@
r22 v1 dV c0 t2026-01-01T00:00:00Z i0 u Tnetwork=rcn,ref=geen,route=bicycle,type=route Mw10@
"""


class BuildTests(unittest.TestCase):
    def parse(self):
        return build.parse(io.StringIO(OPL))

    def test_junctions_are_normalized_and_deduplicated(self):
        junctions, _, _ = self.parse()
        self.assertEqual(junctions, [(5, 5165411, 533312)])

    def test_places_prefer_dutch_name_and_skip_hamlets(self):
        _, places, _ = self.parse()
        self.assertEqual(places, [("Brussel", 5085000, 435000), ("Rosmalen", 5171866, 536292)])

    def test_connections_have_sorted_numbers_and_a_point_on_the_route(self):
        _, _, connections = self.parse()
        self.assertEqual(connections, [(21, 40, 5161000, 531000)])

    def test_output_has_version_license_and_attribution(self):
        out = io.StringIO()
        sys.stdin, saved = io.StringIO(OPL), sys.stdin
        sys.argv, saved_argv = ["build.py"], sys.argv
        try:
            with redirect_stdout(out):
                build.main()
        finally:
            sys.stdin, sys.argv = saved, saved_argv
        data = json.loads(out.getvalue())
        self.assertEqual(data["v"], 1)
        self.assertIn("ODbL", data["license"])
        self.assertIn("OpenStreetMap", data["attribution"])
        self.assertEqual(set(data), {"v", "date", "license", "attribution", "j", "c", "p"})


if __name__ == "__main__":
    unittest.main()
