# KHIX Clean Vector Floor Plans Status

Phase: Dashboard maps rebuilt locally; remaining HEC room placements still unresolved

## Decisions

- 2026-10-05: User explicitly chose cleaned plans for review first; do not update dashboard floor data.
- Five original PDFs found in Downloads: BA1 (5 sheets), BA2 (4), ENG1 (4), ENG2 (4), Student Union (one sheet with 3 floors).
- Engineering room envelopes were manually traced; native BA/SU geometry was preserved and cleaned. Text and geometry remain separate.
- Preserve historical source IDs, including repeats and unusual floor prefixes. Uncertain scan boundaries are noted instead of claiming survey accuracy.
- User subsequently supplied HEC_floor_plan.pdf and requested only floor 1 as a continuous plan. Sheets 1 and 2 are joined; upper-floor sheets are excluded.
- User approved temporary review IDs for unnumbered/unreadable spaces. Each is marked Uxx\* on the drawing and recorded with its full building/floor ID.

## Work

- [x] Locate sources and inspect every page.
- [x] Trace Engineering room envelopes and correct native-plan room labels.
- [x] Produce six review PDFs, 21 SVGs, an original/cleaned comparison index, and review notes.
- [x] Inspect every rendered output page, repair fill/winding issues, and validate text extraction.
- [x] Validate Engineering polygons and fix overlapping boundaries.
- [x] Preserve original PDFs and verify source hashes.

## Outputs

`output/pdf/khix-floor-plans/` contains the PDFs, SVGs, comparison index, source previews, manifest, validation report, and reproducible authoring files.

`output/pdf/khix-floor-plans-review.zip` contains the complete review set.

## Validation

Passed:

- `/tmp/khix-floor-tracing-venv/bin/python output/pdf/khix-floor-plans/authoring/build.py`
- `/tmp/khix-floor-tracing-venv/bin/python output/pdf/khix-floor-plans/authoring/review.py`
- Six PDFs / 21 pages; SVG/PDF geometry is vector-only.
- Every authored label appears in extracted PDF text; text remains inside page bounds.
- Engineering and HEC room polygons are valid and non-overlapping.
- Source checksums match the generation manifest.
- 173 temporary IDs are globally unique and distinguished from source/verified numbers.
- HEC has one valid continuous exterior outline, 45 labeled room/service spaces, and only floor 1.
- SU ballroom sections have full IDs; Engineering suffix placements and BA2 conference/office IDs were corrected against source sheets.
- Visual inspection of all 21 pages, with source comparisons and enlarged room-label checks.

## Boundary and limitations

Engineering traces close across doors and simplify curved edges; they describe room envelopes, not door connectivity. Most Engineering sources date to December 2012; ENG1 floor 3 dates to September 2008. Review notes identify specific faint partitions and BA2's overprinted break-room label.

No dashboard replacement, commit, push, or application behavior change was made in this artifact task. Existing map-branch changes remain untouched. Application CI was not rerun for these standalone artifacts.

Review files include the room inventory (CSV/JSON), HEC source A/B comparison, reproducible authoring scripts, and the rebuilt ZIP.

## HEC numbering correction — October 5

- Replaced U41–U44 with HEC 101, 117, 118 and 119, comparing faint Zone B labels with official UCF room listings. Preserved trace IDs and recorded evidence in the authoring data/inventory.
- Replaced U38 with HEC 125, explicitly marked as an inferred placement: it is the only large tiered hall in the supplied plan, and UCF lists 125 as the 231-seat lecture classroom. A clearer plan must confirm this before import.
- UCF confirms HEC 103, 104, 110, 111 and 113 exist, but their positions cannot be established reliably from this scan. Forty HEC service/room IDs remain temporary. The numbering request is only partially resolved; no sequential official numbers were invented.
- HEC 101 is reservable as A/B, but no interior divider was invented because this source only shows a single envelope.
- Updated HEC PDF/SVG/preview, inventories, manifest, review index, notes, authoring data and ZIP. Other building PDFs were not regenerated.
- Passed targeted HEC generation, whole-artifact validation (6 PDFs / 21 pages), Poppler render/visual inspection, and git diff --check. Application checks were not relevant; app files and original PDFs remain untouched.

Supplementary sources:

- https://www.cecs.ucf.edu/hec-room-reservations/
- https://www.fs.ucf.edu/wp-content/uploads/sites/3/2024/05/UCF-Space-Utilization-Report_04-30-24.pdf (PDF page 85)

## Dashboard integration — October 5

- User explicitly requested returning to the maps tree and rebuilding all maps. The primary checkout was already on `blade/khix-map-room-access-pr` (PR #594); earlier local changes were preserved.
- Added a reproducible importer under `apps/2026/scripts/floor-plans/`, with source hashes, counts and the existing Engineering wayfinding additions recorded separately. Rebuilt all 17 dashboard floors across BA1, BA2, ENG1, ENG2, Student Union and HEC.
- Native BA/SU wall details are ten per-floor SVG assets, with separate typed room labels and hit areas. Open/ambiguous regions use location markers; multiple room numbers are never combined into a made-up envelope. Engineering and HEC use the cleaned manual polygons directly.
- HEC has one continuous first-floor outline and 45 room/service envelopes. Only 101, 117, 118 and 119 are official lookup aliases; inferred 125 is a generic lecture hall, and other unresolved numbers stay unmapped. Temporary authoring references never resolve as event destinations.
- Preserved access/activity color rules, bathroom metadata, Engineering check-in/atrium/exits and the fixed stair core. Extended the existing unused southeast-wing filter to cover the four additional rooms recovered during tracing, preventing isolated boxes from appearing there.
- Inspected standalone rendered previews for all 17 floors under `output/map-rebuild/`; these are generated floor drawings, not browser screenshots. Also inspected the native walls without labels to confirm the image layer does not embed room text. Removed duplicate Engineering stair captions and aligned bathroom captions with the new room anchors. Shared source rooms display both official numbers while restricted views still show only permitted aliases.
- Validation: all 65 KHIX tests passed; app typecheck, app formatting and React analysis passed (16 files, zero failures). App lint passed with existing warnings; the new asset test subsequently caught one unnecessary optional chain, which was removed. Geometry audit: 977 valid, non-overlapping envelopes, with every label anchor inside its room. A second import reproduced all 12 generated data/asset/manifest files byte-for-byte after formatting.
- The ordinary app build initially failed because local `KHIX_HACKER_PORTAL_CLIENT_ID` and `KHIX_HACKER_PORTAL_ORIGIN` are unset. Production compilation succeeded with temporary nonsecret loopback build values; no environment file or deployed configuration was changed.
- Browser verification remains blocked by the existing computer-use URL-policy rejection; no live desktop/mobile screenshots or interaction pass are claimed. The local servers on 3007/3008 remain running.
- Changes remain local and uncommitted on PR #594's branch. No push, merge, API/schema/auth/dependency or deployment changes were made for this import.

## Room-number readability — October 5

- Increased room-number text from 7 to 12 map units on desktop and mobile, with opaque warm-white text, heavier weight and a dark outline. Secondary room/service labels use 9 units; configured room names stay subordinate at 10.
- Rendered room labels in a separate top layer so neighboring room fills and live-event glow cannot obscure the text. Restricted rooms still produce no number label, and this noninteractive text layer leaves room clicks/keyboard actions on the existing room geometry.
- Condensed text horizontally where upright label rows are tightly packed, preserving the larger number height. Checked standalone BA1, Engineering and HEC previews; live browser verification remains blocked by the existing URL policy.
- Validation: KHIX typecheck and all 65 tests passed; targeted ESLint passed with the three existing size warnings; React analysis passed (16 files, zero failures); formatting and diff checks passed. This follow-up changes only the map component/styles and this status record, and remains uncommitted.
