"""Import the reviewed vector plans; no OCR or source-PDF interpretation.

Run with an authoring Python environment containing pymupdf, numpy, opencv
and shapely. See README.md. These are build-time tools, not app dependencies.
"""
import argparse
from collections import Counter, defaultdict
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

import cv2
import numpy as np
import pymupdf as fitz
from shapely.geometry import Point, Polygon
from shapely.ops import unary_union

APP = Path(__file__).resolve().parents[2]
NS = "{http://www.w3.org/2000/svg}"
ET.register_namespace("", NS[1:-1])
BUILDINGS = {"BA1": "ba1", "BA2": "ba2", "ENG1": "eng1",
             "ENG2": "ucf-91", "SU": "student-union", "HEC": "hec"}
NUMBER = re.compile(r"\d{3}(?:[A-Z]|-\d+)?")


def path(points):
    return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in points) + " Z"


def polygon_path(poly):
    if poly.is_empty:
        return ""
    if poly.geom_type != "Polygon":
        return " ".join(polygon_path(p) for p in getattr(poly, "geoms", []))
    return " ".join(path(r.coords) for r in [poly.exterior, *poly.interiors])


def read_polygon(d):
    # Legacy Engineering landmark envelopes contain absolute M/L/H/V/Z.
    points = []
    x = y = 0
    for command, coords in re.findall(r"([MLHVZ])([^MLHVZ]*)", d):
        values = [float(n) for n in re.findall(r"-?\d+(?:\.\d+)?", coords)]
        if command in ("M", "L"):
            x, y = values
        elif command == "H":
            x = values[0]
        elif command == "V":
            y = values[0]
        else:
            continue
        points.append((x, y))
    return Polygon(points)


def fit(box):
    x, y, w, h = box
    scale = min(940 / w, 640 / h)
    return scale, (1000 - w * scale) / 2 - x * scale, (700 - h * scale) / 2 - y * scale


def native(file, public, overrides):
    root = ET.parse(file).getroot()
    box = list(map(float, root.attrib["viewBox"].split()))
    scale, dx, dy = fit(box)
    label_group = root.find(f"{NS}g[@id='room-labels']")
    entries = []
    for el in label_group.iter(f"{NS}text"):
        label = el.text or ""
        override = overrides.get(label)
        x = float(el.get("x"))
        y = float(el.get("y")) - float(el.get("font-size")) * .34
        entries.append(dict(text=override["roomNumber"] if override else label,
                            x=x, y=y, marker=bool(override)))
    root.remove(label_group)

    # Discover only enclosed regions with exactly one room ID. Merged/open
    # spaces get a location marker, never a fabricated rectangular room.
    doc = fitz.open("svg", ET.tostring(root))
    pdf = fitz.open("pdf", doc.convert_to_pdf())
    pix = pdf[0].get_pixmap(matrix=fitz.Matrix(4, 4), colorspace=fitz.csGRAY)
    ink = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width) < 180
    numbered = [e for e in entries if NUMBER.fullmatch(e["text"])]
    envelopes = {}
    for kernel in (13, 21, 31):
        walls = cv2.morphologyEx(ink.astype(np.uint8), cv2.MORPH_CLOSE,
                                cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel, kernel)))
        _, regions, stats, _ = cv2.connectedComponentsWithStats(1 - walls)
        seeds = defaultdict(list)
        for i, entry in enumerate(numbered):
            x = round((entry["x"] - box[0]) * 4)
            y = round((entry["y"] - box[1]) * 4)
            if 0 <= x < pix.width and 0 <= y < pix.height:
                seeds[int(regions[y, x])].append(i)
        for region, indices in seeds.items():
            if not region or len(indices) != 1 or indices[0] in envelopes:
                continue
            if not 40 < stats[region, cv2.CC_STAT_AREA] < ink.size * .08:
                continue
            mask = (regions == region).astype(np.uint8)
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            contour = max(contours, key=cv2.contourArea)
            contour = cv2.approxPolyDP(contour, 1.5, True).reshape(-1, 2)
            points = [(box[0] + x / 4, box[1] + y / 4) for x, y in contour]
            poly = Polygon(points)
            if poly.is_valid and poly.area > 0:
                envelopes[indices[0]] = points

    rooms, labels, ids = [], [], Counter()
    for i, entry in enumerate(numbered):
        label = entry["text"]
        ids[label] += 1
        x, y = entry["x"] * scale + dx, entry["y"] * scale + dy
        points = None if entry["marker"] else envelopes.get(i)
        room = dict(id=f"{label}-{ids[label]}", label=label, roomIds=[label], x=round(x, 2), y=round(y, 2))
        if points:
            room["path"] = path([(px * scale + dx, py * scale + dy) for px, py in points])
        else:
            room["geometry"] = "marker"
            room["path"] = f"M{x-8:.2f},{y:.2f}a8,8 0 1,0 16,0a8,8 0 1,0 -16,0"
        rooms.append(room)
    for entry in entries:
        if not NUMBER.fullmatch(entry["text"]) and entry["text"] not in {
                override.get("replacesCaption") for override in overrides.values()}:
            labels.append(dict(text=entry["text"], x=round(entry["x"] * scale + dx, 2),
                               y=round(entry["y"] * scale + dy, 2)))

    # Keep the exact architectural vector wall layer separate from hit areas.
    # White masks must stay opaque so source compositing is preserved.
    for el in root.iter():
        for attr in ("fill", "stroke"):
            if el.get(attr) == "white":
                el.set(attr, "#0b1b14")
            elif el.get(attr) in ("#111", "#111111", "black"):
                el.set(attr, "#718478")
    for el in list(root):
        if el.tag == f"{NS}rect":
            root.remove(el)
    output = public / file.name
    output.write_bytes(ET.tostring(root))
    return dict(rooms=rooms, labels=labels, structureImage=dict(
        href=f"/maps/floors/{file.name}", x=round(box[0] * scale + dx, 4),
        y=round(box[1] * scale + dy, 4), width=round(box[2] * scale, 4), height=round(box[3] * scale, 4)))


def traced(floor, landmarks):
    building, n = floor["building"], floor["floor"]
    if building == "ENG2":
        # Keep the existing atrium/check-in landmarks in the same map frame.
        scale, dx, dy = .46, 80, 25
    else:
        points = [p for r in floor["rooms"] for p in r["points"]] + floor.get("outline", [])
        xs, ys = zip(*points)
        scale, dx, dy = fit((min(xs), min(ys), max(xs)-min(xs), max(ys)-min(ys)))
    def convert(p):
        return round(p[0] * scale + dx, 2), round(p[1] * scale + dy, 2)
    rooms, labels, polygons = [], [], []
    for r in floor["rooms"]:
        status = r.get("label_status", "source-number")
        label = r["label"]
        official = [s.strip() for s in label.split("/") if NUMBER.fullmatch(s.strip())]
        unverified = status in ("temporary-review-id", "number-known-placement-inferred")
        if unverified:
            official = []
            label = r.get("source_label", "") or "Unnumbered"
            if status == "number-known-placement-inferred":
                label = "Lecture hall"
        if not r["points"]:
            if r.get("at"):
                x, y = convert(r["at"])
                labels.append(dict(text=label, x=x, y=y))
            continue
        pts = [convert(p) for p in r["points"]]
        poly = Polygon(pts)
        if not poly.is_valid:
            raise ValueError(f"Invalid room {building} {n} {label}")
        polygons.append(poly)
        at = Point(convert(r["at"])) if r.get("at") else poly.centroid
        if not poly.covers(at):
            at = poly.representative_point()
        room = dict(id=r.get("trace_id", r["label"]), label=label, roomIds=official,
                    path=path(pts), x=round(at.x, 2), y=round(at.y, 2))
        if unverified:
            room["reviewId"] = r.get("trace_id", r["label"])
        if r.get("source_label") == "WC" or r["label"] == "WC":
            room["kind"] = "bathroom"
        if building == "ENG2" and (n, r["label"]) in ((1, "108"), (2, "208"), (2, "207"), (3, "307"), (3, "306")):
            room["kind"] = "bathroom"
        rooms.append(room)
    plan = dict(rooms=rooms, labels=labels)
    if floor.get("outline"):
        plan["outlinePath"] = path([convert(p) for p in floor["outline"]])
    if building == "ENG2" and str(n) in landmarks:
        extra = deepcopy(landmarks[str(n)])
        rooms.extend(extra["rooms"])
        occupied = unary_union(polygons + [read_polygon(r["path"]) for r in extra["rooms"]])
        walkable = []
        for area in extra["walkableAreas"]:
            shape = read_polygon(area["path"]).difference(occupied)
            if not shape.is_empty:
                area["path"] = polygon_path(shape)
                if not shape.covers(Point(area["x"], area["y"])):
                    at = shape.representative_point()
                    area["x"], area["y"] = round(at.x, 2), round(at.y, 2)
                walkable.append(area)
        plan["walkableAreas"] = walkable
        for label in extra["labels"]:
            # The traces already label each stair envelope. Retain event
            # landmarks and align bathroom captions with the new anchors.
            if label["text"] == "STAIRS":
                continue
            if label["text"] in ("MEN", "WOMEN"):
                target = "108" if n == 1 else "208" if label["text"] == "MEN" else "207"
                room = next(r for r in rooms if target in r["roomIds"])
                label["x"], label["y"] = room["x"], room["y"]
            plan["labels"].append(label)
    return plan


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, nargs="?",
                        default=Path(__file__).parent / "source",
                        help="Reviewed plans directory (defaults to the bundled source)")
    args = parser.parse_args()
    source = args.source.resolve()
    public = APP / "public/maps/floors"
    public.mkdir(parents=True, exist_ok=True)
    plans = {b: {} for b in BUILDINGS.values()}
    inputs = {}
    override_file = Path(__file__).parent / "room-label-overrides.json"
    overrides = json.loads(override_file.read_text())
    inputs[override_file.name] = hashlib.sha256(override_file.read_bytes()).hexdigest()
    for file in sorted((source / "svg").glob("*.svg")):
        slug, n = file.stem.split("-floor-")
        if slug not in ("ba1", "ba2", "su"):
            continue
        if (slug, n) in (("ba1", "5"), ("ba2", "4")):
            continue  # Roof sheets are not occupied dashboard floors.
        building = BUILDINGS[slug.upper()]
        plans[building][n] = native(file, public, overrides.get(file.name, {}))
        inputs[file.name] = hashlib.sha256(file.read_bytes()).hexdigest()
    engineering = source / "authoring/engineering-rooms.json"
    hec = source / "authoring/hec-rooms.json"
    landmarks = json.loads((Path(__file__).parent / "engineering-landmarks.json").read_text())
    for file in (engineering, hec):
        inputs[file.name] = hashlib.sha256(file.read_bytes()).hexdigest()
        floors = json.loads(file.read_text())
        for floor in floors if isinstance(floors, list) else [floors]:
            if floor["building"] == "HEC" and floor["floor"] != 1:
                raise ValueError("Only HEC first floor was approved for import")
            if floor["building"] == "ENG2" and floor["floor"] > 3:
                continue  # Event coverage includes the source-verified ENG2 302.
            plans[BUILDINGS[floor["building"]]][str(floor["floor"])] = traced(floor, landmarks)
    target = APP / "src/lib/venue-floor-plans.generated.ts"
    target.write_text('// Generated by scripts/floor-plans/rebuild.py from reviewed vector plans.\n'
                      'import type { VenueFloorPlans } from "./venue-floor-plans";\n\n'
                      'export const VENUE_FLOOR_PLANS = ' + json.dumps(plans, indent=2) +
                      ' satisfies VenueFloorPlans;\n')
    report = {"inputs": inputs, "floors": {
        f"{building}-{n}": {"rooms": len(f["rooms"]), "locationMarkers": sum(r.get("geometry") == "marker" for r in f["rooms"])}
        for building, floors in plans.items() for n, f in floors.items()}}
    (Path(__file__).parent / "manifest.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report["floors"], indent=2))


if __name__ == "__main__":
    main()
