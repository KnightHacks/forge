# KHIX Clean Vector Floor Plans Review Checks

- All source buildings/floors represented, with roof-only pages distinguished from ordinary floors.
- Original PDFs unchanged by checksum.
- Every output page renders without clipping and has readable building/floor identity.
- SVG separates wall geometry and text; exported PDFs retain selectable room numbers.
- Traced rooms/landmarks retain original relative position and shape; no inferred rooms or labels added silently.
- Low-confidence/illegible labels are marked for review.
- Dashboard import covers all 16 previously mapped occupied floors plus the approved HEC first floor (17 total).
- Floor assets resolve locally; room keys, coordinates and paths are valid. Every corrected Engineering suffix and SU ballroom section remains searchable.
- HEC has only floor 1 and a single outline. Temporary IDs and inferred HEC 125 do not resolve as official event destinations.
- Engineering check-in, stair core, exits, bathroom classifications and room restrictions survive the import.
- Regeneration from the same reviewed inputs is deterministic; inspect all 17 generated floor previews and run KHIX tests, typecheck, lint, React analysis and production compilation.

- HEC contains only floor 1, assembled from source sheets A/B into one valid exterior polygon.
- All traced Engineering/HEC envelopes have an ID, and all temporary IDs are globally unique and visibly distinguished.
- SU ballroom sections retain complete IDs; official supplementary numbers have source URLs.
- No alarm-device address is promoted into a room number.

- HEC displays full building-prefixed recovered room numbers; inventory records the source and distinguishes inferred placement from confirmed numbering. Unknown western room placements must remain unresolved.
