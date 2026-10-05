# KHIX Clean Vector Floor Plans SRD

Status: Reviewed geometry imported into the dashboard

## Architecture

A local, reproducible authoring process reads the six original PDFs without modifying them. Preserve native vector geometry when suitable. Trace scanned geometry into clean vector boundaries, and keep typed labels in their own SVG group and PDF text layer. Export under output/pdf/khix-floor-plans; intermediate renders and OCR candidates belong under tmp/pdfs/khix-floor-redraw.

OCR is a discovery aid, not authority. Compare candidate room identifiers with source renders, correct readable errors, and list unresolved readings in the review notes. Historical dashboard extraction is not a source of truth: it contains mislabeled merged regions.

## Access and compatibility

The user approved dashboard rebuilding after the review phase. The importer lives in `apps/2026/scripts/floor-plans/`, reads the reviewed vector/typed-label artifacts, and emits static TypeScript room data plus per-floor native wall SVG assets. Temporary authoring tools live outside the repository dependencies. No new API, schema, authentication, or dependency manifest changes.

Engineering and HEC use the manually traced envelopes. Native BA/SU walls remain exact SVG paths, loaded only for the active floor; unambiguous closed regions provide hit areas. Multiple labels in one region never become a merged room. Open/ambiguous regions have explicit point-marker geometry. Room configuration continues to determine activity/access colors and label visibility. Existing Engineering atrium/check-in additions are retained separately and clipped around the rebuilt rooms.

Only corroborated HEC room placements are lookup aliases. HEC 125 remains a generic lecture-hall label because its placement is inferred; unplaced room numbers are excluded. HEC's continuous outline and first-floor-only selector are explicit data contracts. BA roofs and ENG2 floors 3–4 remain outside dashboard coverage.

## Verification

Inspect every exported page, compare source geometry, verify typed labels survive PDF extraction, and confirm no source PDF was changed. Include explicit provenance and uncertainty for low-resolution Engineering scans dated December 2012.

HEC joins source sheets 1 and 2 along their shared match line using a small similarity transform. The review SVG stores one continuous building outline plus individually identified rooms. Uxx\* display labels resolve to building-floor-Uxx in the machine-readable room inventory; they are never treated as verified official numbers.
