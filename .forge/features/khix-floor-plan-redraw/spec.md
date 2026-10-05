# KHIX Clean Vector Floor Plans Spec

Status: Dashboard integration authorized after review

## Purpose

Redraw the supplied floor plans with clear room boundaries and readable room numbers so the map import system does not need to interpret uneven printed/scanned ink.

## Scope

- Source PDFs found in Downloads: BA1, BA2, Engineering I, Engineering II, Student Union, and HEC.
- Create review PDFs and editable SVG floor plans, retaining source geometry and typed room labels.
- Mark uncertain source readings explicitly; do not invent room numbers or missing architecture.
- Add room numbers throughout; the user approved clearly marked temporary review IDs for unnumbered spaces.
- Combine HEC first-floor Zone A/B sheets into one continuous drawing; exclude upper floors.
- Preserve the originals. The user requested review files first, then explicitly asked to return to the maps branch and rebuild all dashboard maps.
- Integrate the cleaned plans into the existing maps PR, covering 17 dashboard floors across all six buildings. Preserve the event's existing floor coverage and access configuration.

## Acceptance

- Consistent dark vector boundaries, light background, and selectable text.
- Floor/building identity and original source provenance accompany every plan.
- Room identifiers and wall geometry remain separate, machine-readable objects in SVG.
- Render and inspect the exported PDFs and verify text extraction.
- Rebuild dashboard geometry, preserving typed room lookups and event interactions. Keep ambiguous regions as location markers and never promote temporary/inferred numbers to official aliases.
- No application access, API, database, dependency manifest, or deployment changes in the import task.
