# Dashboard floor-plan import

`rebuild.py` consumes the cleaned, reviewed plans bundled in `source/`.
It reads its typed labels and vector geometry; it does not OCR the original scans.

Run from the repository root with a Python authoring environment that already has
PyMuPDF, NumPy, OpenCV and Shapely available:

```sh
python apps/2026/scripts/floor-plans/rebuild.py
pnpm exec prettier --write apps/2026/src/lib/venue-floor-plans.generated.ts
pnpm --filter=@forge/2026 test
```

The checked-in output was reproduced with Python 3.14.7, PyMuPDF 1.28.2,
NumPy 2.5.3, opencv-python-headless 5.0.0.93 and Shapely 2.1.2. These are
authoring tools only; the application serves the generated assets directly.

Outputs are `src/lib/venue-floor-plans.generated.ts`, ten native wall SVGs under
`public/maps/floors`, and the input hashes/counts in `manifest.json`. The source
inputs include ten labeled BA/SU vector drawings and the Engineering/HEC room
traces. These inputs are versioned so regeneration does not depend on a local
review export. An optional directory argument can select another reviewed
artifact with the same `svg/` and `authoring/` structure. Original PDFs and
temporary preview exports remain outside the runtime bundle.

- All 18 occupied dashboard floors are rebuilt, including ENG2 floor 3 for room 302. BA roof sheets and ENG2 floor 4 remain outside the event coverage. HEC has
  only the joined first floor.
- Engineering/HEC use the traced envelopes directly. Existing Engineering
  wayfinding/atrium additions are recorded separately in `engineering-landmarks.json`;
  their fill is clipped around the rebuilt rooms. These are not a routing graph.
- BA/SU retain detailed native walls in SVG assets loaded only for the active
  floor. Enclosed single-room regions supply activity hit areas. Open or ambiguous
  regions use room-position markers, rather than merging multiple rooms or
  fabricating rectangles. Room labels remain real accessible application text.
- The existing room access configuration and Engineering bathroom metadata still
  apply. Temporary review IDs are internal references, never official lookup aliases.
- HEC 101, 117, 118 and 119 have corroborated placements. HEC 125's inferred
  placement is shown only as “Lecture hall”; 103, 104, 110, 111 and 113 remain
  unmapped until their positions can be verified.
- `room-label-overrides.json` assigns the owner's supplied room 232 number to
  the existing Student Union Starbucks source anchor. It stays a point marker;
  the partially masked source food-court polygon is not used as an invented
  room outline. The original review artifact remains unchanged.
- The first-floor BA1 atrium keeps its source anchor 128 and is named BA1 Atrium.
  The source-defined 101/102 hallways and 127 stair core retain their numbers
  with circulation metadata, keeping them free of unavailable-room hatching.
- `venue-room-directory.ts` records the 46 confirmed rooms plus BA1 Atrium (source number 128),
  without booking hours or permission flags. Forty-three resolve to mapped
  geometry; HEC 103, 110, 111 and 125 remain building-level fallbacks. Leading
  zeros, BA1 Atrium, named Student Union rooms and whole-ballroom aliases resolve locally.
  The KHIX view highlights only this roster; other rooms retain striped
  outlines and their verified room numbers. Organizer restrictions can narrow the roster further. Known
  bathrooms and circulation remain identifiable.

Student Union names and ballroom sections are corroborated by UCF's
[room capacity/rates sheet](https://studentunion.ucf.edu/wp-content/uploads/sites/39/2025/07/Room_Rates_Updated_July_2025.pdf)
and Starbucks' floor by its [vendor directory](https://studentunion.ucf.edu/food-and-vendors/).
The HEC room identities are corroborated by UCF's
[2025 technology refresh report](https://fp.ucf.edu/wp-content/uploads/projects/costs/2025/25116001%20HEC%201st%20Floor%20Technology%20Refresh%20Plan%20Upgrade.pdf),
which does not establish the missing four positions.

After rebuilding, inspect the floor drawings at overview and room zoom, run the
floor/room-access tests and app typecheck, and check generation is deterministic.
