#!/usr/bin/env python3
"""Derive the 2021 population of each of Toronto's six former municipalities.

The panel's borough sub-list needs a current population for Old Toronto, North
York, Scarborough, Etobicoke, York and East York. No agency publishes one:
Statistics Canada's smallest municipal geography is the whole City of Toronto,
and the City's own community council areas merge Old Toronto with East York and
Etobicoke with York. So the figures are derived here, from two official sources:

  - Statistics Canada, 2021 Census Geographic Attribute File (92-151-X), which
    gives the 2021 population of every dissemination block together with the
    representative point of its dissemination area.
  - City of Toronto Open Data, "Former Municipality Boundaries" (WGS84 GeoJSON).

Every dissemination area in the City of Toronto census subdivision is assigned
to the former municipality its representative point falls inside, and its blocks'
populations are summed. The check that the assignment lost nobody is that the six
totals add back to 2,794,356 — the published 2021 count for the city, exactly.

Output, which is what src/data/gazetteer.ts carries:

    Old Toronto     841,236
    North York      683,511
    Scarborough     630,145
    Etobicoke       376,237
    York            146,828
    East York       116,399
    total         2,794,356  (published city count 2,794,356, difference 0)

The attribute file is a ~300 MB CSV inside a 10 MB zip; it is downloaded to a
cache directory rather than committed. Only re-run when a new census lands:

    python3 scripts/borough_populations.py [cache-dir]
"""
import collections
import csv
import io
import json
import pathlib
import sys
import urllib.request
import zipfile

GAF_URL = "https://www12.statcan.gc.ca/census-recensement/2021/geo/aip-pia/attribute-attribs/files-fichiers/2021_92-151_X.zip"
BOUNDARIES_URL = (
    "https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/833937f6-e190-49a2-9835-80137cf88c41"
    "/resource/4eadc3a3-bafa-44cf-a43f-f99a7fa98eb4/download/former-municipality-boundaries-data-4326.geojson"
)
TORONTO_CSD = "3520005"
PUBLISHED_TOTAL = 2_794_356

# the City files them in capitals, and calls the pre-1998 city plain "Toronto"
DISPLAY = {"TORONTO": "Old Toronto"}

cache = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/borough-pop")
cache.mkdir(parents=True, exist_ok=True)


def fetch(url: str, name: str) -> pathlib.Path:
    path = cache / name
    if not path.exists():
        print(f"downloading {name} ...", flush=True)
        urllib.request.urlretrieve(url, path)
    return path


def dissemination_areas() -> dict:
    """{DAuid: (population, lat, lon)} for the City of Toronto."""
    zpath = fetch(GAF_URL, "2021_92-151_X.zip")
    das: dict = {}
    with zipfile.ZipFile(zpath) as z:
        name = next(n for n in z.namelist() if n.lower().endswith(".csv"))
        with z.open(name) as raw:
            for row in csv.DictReader(io.TextIOWrapper(raw, encoding="latin-1")):
                if row["CSDUID_SDRIDU"] != TORONTO_CSD:
                    continue
                da = row["DAUID_ADIDU"]
                pop = int(row["DBPOP2021_IDPOP2021"] or 0)
                if da not in das:
                    das[da] = [0, float(row["DARPLAT_ADLAT"]), float(row["DARPLONG_ADLONG"])]
                das[da][0] += pop
    return das


def boroughs() -> list:
    """[(name, [polygon, ...])], each polygon a list of rings of [lon, lat]."""
    path = fetch(BOUNDARIES_URL, "former-municipality-boundaries.geojson")
    out = []
    for f in json.loads(path.read_text())["features"]:
        name = f["properties"]["AREA_NAME"]
        geom = f["geometry"]
        polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
        out.append((DISPLAY.get(name, name.title()), polys))
    return out


def inside(x: float, y: float, ring: list) -> bool:
    """Crossing-number test for a point against one ring."""
    hit = False
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i][0], ring[i][1]
        x2, y2 = ring[(i + 1) % n][0], ring[(i + 1) % n][1]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            hit = not hit
    return hit


def bounds(ring: list):
    xs = [c[0] for c in ring]
    ys = [c[1] for c in ring]
    return min(xs), min(ys), max(xs), max(ys)


das = dissemination_areas()
# polygons with a bounding box each, so most tests are a couple of comparisons
areas = [(name, [(poly, bounds(poly[0])) for poly in polys]) for name, polys in boroughs()]

total = collections.Counter()
missed = 0
for pop, lat, lon in das.values():
    for name, polys in areas:
        if any(
            bb[0] <= lon <= bb[2] and bb[1] <= lat <= bb[3] and all(
                inside(lon, lat, ring) == (i == 0) for i, ring in enumerate(poly)
            )
            for poly, bb in polys
        ):
            total[name] += pop
            break
    else:
        missed += pop

for name, pop in total.most_common():
    print(f"{name:<14} {pop:>9,}")
summed = sum(total.values())
print(f"{'total':<14} {summed:>9,}  (published {PUBLISHED_TOTAL:,}, difference {summed - PUBLISHED_TOTAL:+,})")
if missed:
    print(f"WARNING: {missed:,} people in areas that fell inside no boundary")
