# KHIX Map Room Access Status

## Phase

Implementation is committed; the isolated PR checkout has been reconciled and validated against current main. Original feature validation is complete.

The October 2 styling follow-up is implemented and automated checks pass. Campus and live-event desktop/mobile verification is complete after the Mac was unlocked. The earlier mobile error/retry screenshot remains pending.

## Decisions

- 2026-09-30: Owner approved the plan and one map configuration table. Retain the existing map implementation; new task branch aligned with main.
- HEC active on campus now; indoor plans deferred until verified assets.
- Locate may focus unlisted rooms while retaining restricted styling.
- No bathroom editor; seed known ENG2 labels and fill metadata later.
- Events are expected to use permitted rooms; no automatic allowlisting.
- Preserve unnumbered structural polygons and circulation geometry without inferring room or bathroom identities.
- Keep map configuration in sanitized development backups as officer-managed configuration.
- 2026-10-02: Owner requested consistent styling and removal of repeated live-room badges. Keep green activity colors, accessible state descriptions, and selected-room outlines; use the shared Blade Select and existing app surfaces for new controls and errors.
- 2026-10-02: Owner clarified that the remaining campus clutter was the circular per-event markers, and requested removing only those markers. Retain building LIVE counts and highlights, indoor room interactions, and event-panel navigation.
- 2026-10-02: Owner requested Impeccable refinement of the event card and an in-card X. Reuse the portal typography and map overlay surface for the card and events panel; retain event content, room navigation, and live activity. Keep the close target visible above bounded description scrolling.

## Progress

- [x] Reverse-prompt and approve spec/SRD/test cases.
- [x] Create blade/khix-map-room-access from origin/khix-map and merge origin/main (no conflicts).
- [x] Generate additive database migration.
- [x] Complete API/SDK contracts and integration proof.
- [x] Complete Blade editor and map behavior.
- [x] Run targeted and repository checks.
- [x] Capture and review desktop/mobile screenshots.

## Validation

- Full API suite: 125 files, 995 tests passed, including disposable-database fresh/upgrade migrations, defaults, persistence, participant scope, atomic audit rollback, and cascading deletion. Officer authorization and contract coverage pass.
- Full Blade suite: 157 files, 883 tests passed, including failed-save edit preservation and successful-save refresh.
- Full KHIX suite: 7 files, 57 tests passed, including all room states, event overlap and exact hour boundary, HEC aliases/placement, room lookup, and evidenced bathroom metadata.
- Full validators suite: 26 files, 327 tests passed. Full SDK suite: 6 files, 37 tests passed.
- Full database suite: 30 files, 157 tests passed. Migration lineage and explicit development-backup classification updated for the new table.
- pnpm db:generate: passed; generated migration 0055.
- pnpm format, pnpm lint, pnpm typecheck: passed repository-wide. Lint retains existing warnings and size warnings; no errors.
- pnpm analyze:react:changed: passed, 14 files analyzed, 0 failures.
- pnpm --filter=@forge/blade build and pnpm --filter=@forge/2026 build: passed.
- Real browser checks at 1440px and 320px passed: keyboard building entry, activity/access colors, bathrooms, restricted-room Locate, HEC event footprint and unavailable indoor plan, configuration error/retry, long names, 60-row editor, saved data after reload, reduced motion, and no horizontal overflow.
- Built KHIX browser checks passed: pending configuration blocks presentation; 30-second refresh attempts; a failed refresh retains prior policy; Retry recovers.
- Eight screenshots captured and inspected. Impeccable independent finish reviewer: ship, no material fixes. Documentation handoff: preserves incumbent systems, no new design artifacts.
- Local screenshots and browser assertions retained in the task's visualization folder under issue-581; temporary previews stopped and disposable fixture database removed.
- Feature generator initially hit tsx IPC sandbox EPERM; equivalent node --import tsx invocation succeeded.
- 2026-10-02: Local testing sign-in initially redirected to the hosted portal because the local environment selected its production origin. Owner approved a process-only KHIX_HACKER_PORTAL_ORIGIN=http://localhost:3007 override; verified a fresh callback stays on localhost. No .env or production settings changed. The local migration ledger matched 0054 with only 0055 pending; pnpm db:migrate applied 0055 to the loopback development database. SDK adapter tests: 13 passed.
- 2026-10-02: Owner requested a legend styling refinement. Reused the map controls' translucent surface, subtle border, rounded corners, and typography; retained labels and room colors. Desktop and 320px mobile browser screenshots inspected: all five labels remain readable without clipping. Targeted Prettier, KHIX typecheck, and KHIX lint passed (existing lint warnings only). The React analysis command hit the tsx IPC sandbox restriction; the equivalent `node --import tsx scripts/analyze-react-changed.ts` passed with 14 files and zero failures. Impeccable's detector reported only existing Arial font warnings, retained to preserve the map's visual system.
- 2026-10-02: Owner requested a local event test and approved a confirmed test application. Reused the account's existing participant profile and created confirmed KHIX application `d8b7addb-f687-417e-b716-a56307913b26`. Created local fixture event `5d59df45-c918-4f7e-85b2-07d797aae715`, “Local map room test,” in BA1 145A, ending at 2026-10-02 16:14 America/New_York. Because both external publishers were enabled, the fixture uses legacy/import mode with disabled provider states; publication and reminder jobs exclude it. No agreement acceptance or external messages were created. Verified in the real local map that Events unlocked, BA1 145A turned green with its LIVE badge, and Happening now showed one event. Restrictions were off at verification; the stored BA1 145A list was preserved.

### October 2 styling follow-up validation

- Blade room editor: shared Select, 44px controls, and background/border treatments aligned with the neighboring portal editor. KHIX initial configuration failure reuses MapMessageState; refresh failures reuse the map overlay surface and error palette. Removed the room-level LIVE/HERE pill and its unused CSS, retaining selection outlines and event details.
- Targeted tests passed: Blade editor 2 tests; KHIX venue and room-access tests 23 tests. Both app typechecks passed. Targeted ESLint passed with component/file size warnings only. Targeted Prettier and git diff --check passed.
- `pnpm analyze:react:changed` failed with `listen EPERM` creating the tsx IPC pipe. Equivalent `node --import tsx scripts/analyze-react-changed.ts` passed (14 files, zero failures). Direct analysis also passed for the untracked Blade editor and its test (2 files, zero failures).
- Impeccable detector reported existing Arial font warnings only; preserved the established map typography.
- Real Blade desktop and 320x640 mobile screenshots inspected, including the shared dropdown menu. No visible clipping in the room editor. No saved configuration or database records were changed.
- A temporary loopback proxy supplied three synthetic live events to the real KHIX frontend. Desktop render inspected; DOM confirmed all three rooms retained green live state and labels without badges. This did not write to the database. Reliable mobile/error screenshots and remaining interactive retry checks could not complete after the Mac locked and browser control timed out. Temporary proxy stopped.
- Campus marker follow-up: removed per-event circles and their unused marker styles/pulse animation, preserving building LIVE counts/highlights and event-panel navigation. Full KHIX suite passed (7 files, 57 tests), KHIX typecheck passed, targeted lint passed with existing size warnings, and React analysis passed through the equivalent Node launcher (14 files, zero failures). Targeted Prettier and diff checks passed after formatting. Impeccable detector retained only existing Arial font warnings. Screenshot verification remains pending because the Mac is still locked.
- Live retest after unlocking: reactivated only the existing loopback fixture event through 2026-10-02 17:22 America/New_York. Both external sync states remain disabled and legacy/import mode remains enabled. Real campus screenshot confirmed BA1's building count without circular event markers; the indoor view confirmed green BA1 145A without a room LIVE badge.
- Event card refinement: desktop and 320x640 screenshots inspected with the real local live event. Portal typography, readable metadata, shared overlay surface, and the in-card X render without clipping. Clicking X dismisses the card; Explore events reopens it and focuses BA1 145A. Browser responsive mode restored afterward. Screenshots saved in this task's visualization folder as event-card-desktop.png and event-card-mobile.png.
- Event card checks: full KHIX suite passed (7 files, 57 tests), KHIX typecheck passed, targeted ESLint passed with three existing size warnings, and equivalent React analysis passed (14 files, zero failures).
- Targeted Prettier and git diff --check passed. Impeccable detector reported only six existing Arial declarations in the map geometry/control styles; retained those outside this card refinement. The event card and events panel use the portal font tokens.

## Links

- Issue: https://github.com/KnightHacks/forge/issues/581
- PR: [#594](https://github.com/KnightHacks/forge/pull/594).
- PR description source: [pr-description.md](pr-description.md), with 13 captioned screenshots captured October 3. GitHub body pins the images to validated commit `8106fb2d`.

### October 3 screenshot handoff

- Captured and inspected the Blade editor and shared building selector, mobile editor, campus overview without circular event markers, HEC fallback, room states and legend, bathrooms, restricted-room lookup, event list, desktop/mobile event cards, and desktop refresh-failure overlay.
- Temporarily enabled restrictions and configured three named BA1 rooms for screenshot coverage. Restored the original configuration afterward: restrictions off, BA1 145A with no optional name. Removed the disposable upcoming event; existing local test event publishing/reminders remained disabled.
- Stopped the temporary configuration-failure proxy and alternate server; restored the ordinary KHIX development server on port 3007. Verified the restored Blade configuration and authenticated KHIX map through the browser.
- Room lookup saved a manually selected local test spot at BA1 196 in this browser. It is not GPS data and does not change room permission.
- Screenshots are stored in this feature bundle. Trimmed empty capture padding and cropped the mobile editor to its card. Separate mobile error/retry capture remains pending. Application code and migrations were untouched during the screenshot handoff; implementation tests were not rerun.
- Handoff checks: all 13 draft image links resolve to readable files; targeted Prettier and `git diff --check` passed. Assets total 1.66 MiB.

## Follow-ups

Verified HEC floor plans and remaining bathroom metadata.

### October 4 GitHub draft preparation

- Owner explicitly authorized creating the draft on GitHub. Committed the original feature and screenshots at `22b2b112`; preserved the running dev checkout on `blade/khix-map-room-access`.
- Created isolated branch `blade/khix-map-room-access-pr` and merged current main `2ad38d14`. Preserved Map, Teams, and Merch navigation, all validator exports, and the main migration history. Regenerated the unpublished map migration as `0058_smart_roulette`, updating lineage and upgrade tests. No local development database migration was run during this merge.
- Original-branch repository format, lint, typecheck, and React analysis passed before committing. The default staged lint hook ran out of Node heap; retrying with an 8 GiB heap passed without bypassing hooks.
- The existing local test event is scheduled October 4, 2:33–2:48 PM America/New_York in BA1 145A. Verified the upcoming event and time in the real map; external sync remains disabled.

- Reconciled branch validation passed: repository format, lint (warnings only), typecheck, and React analysis (29 files, zero failures); all 2,482 affected tests (API 1,017, Blade 885, KHIX 57, validators 327, SDK 37, DB 159); Blade/KHIX builds with dependencies (10 tasks). Fresh/upgrade map migration tests and canonical lineage passed. Main migration artifacts 0055–0057 remain byte-for-byte unchanged.

- Published draft [#594](https://github.com/KnightHacks/forge/pull/594) from `blade/khix-map-room-access-pr`, assigned to `myr124` with Blade, Hack Sites, API, Database, Feature, and Major labels. GitHub reports it mergeable; CI is pending. Primary local checkout remains on `blade/khix-map-room-access`, preserving the running test instance.

### October 5 alignment with the new dashboard

- Checked out the existing PR branch `blade/khix-map-room-access-pr` and merged main `f273c21e`, preserving the PR's history. This update stays local so the owner can continue coding before pushing to PR #594.
- Kept main's persistent dashboard shell and added Map to its route/navigation selection. Removed the map's duplicate shell, retained its page metadata, and passed the loading fallback through the PR's auth boundary split.
- Map uses the shared page gutters, top spacing, typography, lilac interaction accent, and plum overlay surfaces. Room access/activity colors retain their distinct meanings. The Hacker's Guide remains the only page with no padding.
- Preserved the PR's keyboard focus trap and mobile drawer behavior. Confirmed hackers retain schedule access; Merch, Judging, and 3D Printing retain their check-in gates.
- Preserved main's production migration `0058_fresh_zombie` and its snapshot byte-for-byte. Regenerated the unpublished map migration as `0059_needy_menace`, with linear metadata and updated lineage/upgrade tests. No production or existing development database was migrated.
- Validation: repository format, lint, typecheck, and React analysis passed (40 files, zero React failures). Fresh PostgreSQL 16 migration and repeat application passed; regeneration produced no schema changes. All 2,825 tests (29 tasks) and all 21 production build tasks passed. Workspace lint passed with the existing missing `apps/khix/package.json` warning.
- Browser verification is blocked: the computer-use browser URL policy rejected access to the existing localhost preview tab. No new screenshots are claimed. At the owner's subsequent request, the sample-data preview was restored on port 3007, backed by the local Next.js server on 3008. Hosted Blade does not yet expose this PR's map method; the temporary preview fixtures are outside the repository.

### October 5 full-area map follow-up

- Owner requested Map fill the dashboard like the embedded Hacker's Guide. Map now shares that route's fixed-height, zero-padding content container, with no rounded outer frame or surrounding botanicals. The shared grid reserves the sidebar on desktop and menu bar on mobile.
- Removed the map's viewport subtraction and minimum canvas height so it fills the actual available content area, including loading/error states. Kept its accessible heading out of layout flow and preserved the controls' internal spacing and room colors.
- Validation: targeted CSS/document Prettier and diff checks passed. Screenshot verification remains blocked by the browser URL-policy rejection noted above. This follow-up is left uncommitted on the existing PR branch for the owner's continued work.

### October 5 Garage C parking callout

- Owner identified Garage C as the parking destination. Labeled the existing `ucf-83` footprint with “Garage C” and “PARK HERE!!!”, a downward arrow, and a lilac outline matching the dashboard accent.
- Both lines remain visible at every campus zoom and mobile size. The garage is keyboard/click accessible and focuses its footprint; other parking areas keep their existing treatment. No fees, permits, or availability claims were added.
- Validation: KHIX typecheck and all 62 tests passed; targeted ESLint passed with the three existing component/file-size warnings; React analysis passed (16 files, zero failures); formatting and diff checks passed. Browser screenshot verification remains blocked as noted above. Changes remain local and uncommitted.

### October 5 explicit current-location selection

- Removed automatic restoration and persistence of the indoor location. An old saved browser value no longer creates a “You” marker when opening the map. GPS and indoor marker state both start empty; only an explicit successful “Locate me” or “Set my spot” action places the user.
- Validation: KHIX typecheck and all 62 tests passed; targeted ESLint passed with existing size warnings; React analysis passed (16 files, zero failures); formatting and diff checks passed. Screenshot verification remains blocked as noted above. Changes remain uncommitted on the PR branch.

### October 5 live and upcoming event filters

- Replaced All/Live/Food/Help with only Live now and Upcoming, defaulting to Live now. Each selection opens the matching event list and updates its heading, count, and empty state. Upcoming stays ordered by start time; ended events appear in neither list.
- Added accessible pressed states and cleared the prior selected event when changing filters. Existing indoor room access/activity coloring remains independent of the list filter.
- Validation: KHIX typecheck and all 62 tests passed; targeted ESLint passed with existing size warnings; React analysis passed (16 files, zero failures); formatting and diff checks passed. Browser verification remains blocked as noted above. Changes remain local and uncommitted.

## Map availability and compact navigation — October 5 follow-up

- Map now appears directly below Hacker’s Guide in the shared desktop/mobile navigation. A disabled entry with a lock icon explains when it opens.
- Confirmed and checked-in participants unlock it on the hackathon’s first local calendar day: Friday, October 9 at midnight America/New_York for KHIX. All other statuses remain locked. The route does not mount map content or request room configuration until eligible, and the participant API independently checks stored status and server time.
- The shared SDK lifecycle helper keeps navigation, route, and API date/status rules aligned. No schema, dependencies, environment files, or organizer permissions changed. The existing local sample preview now uses the actual October 9 start date.
- Navigation labels, row spacing, logo, and footer are smaller. Desktop rows are 40px; mobile targets remain at least 44px, with scrolling retained for short screens.
- Validation: all 33 workspace typecheck tasks passed; the final hook change also passed KHIX typecheck. SDK tests: 57 passed; KHIX tests: 62 passed; API map integration and participant tests: 44 passed against a disposable loopback PostgreSQL database. React analysis: 16 files, 15 components, zero failures. Targeted lint initially exceeded Node’s heap; the 8GB rerun found one unnecessary optional chain, now fixed and rechecked. Remaining diagnostics are size/type-import warnings. Formatting and diff checks passed.
- Visual verification remains blocked by the browser policy refusal documented above. No new screenshots are claimed. Changes remain local and uncommitted on the maps PR branch; local preview remains running.

## Continuous map background — October 5 follow-up

- Fixed the hard rectangular gradient edge exposed when zooming out or panning beyond the campus canvas. The existing forest/plum ground gradient now fills the map container; the bounded SVG ground rectangle is removed. Campus and indoor geometry, camera movement, and overlays are unchanged.
- Validation: KHIX typecheck passed; targeted ESLint passed with three existing size warnings; React analysis passed (16 files, zero failures); formatting and diff checks passed. The supplied screenshot established the visual defect; fresh browser verification remains blocked as documented above. Changes remain local and uncommitted.

## Mobile map cleanup — October 5 follow-up

- Implemented: owner requested several agents improve the crowded mobile map. Work is scoped to KHIX map controls, event presentation, and camera behavior on the existing PR branch.
- Visual direction: keep the forest canvas dominant, with a compact building/floor bar, one bottom event drawer, and a small utility row. The room key and location form open on demand; event details replace the event list in the same drawer. Preserve room access colors and the larger room numbers.
- Use measured overlay space when fitting floor plans. Touch gestures remain direct; explicit camera changes and drawer opening use short transitions with reduced-motion support. Pinching out stops at the building overview; Back returns to campus.
- Three agents own control CSS, the event drawer, and camera math/tests separately; the main agent integrates and audits behavior. Planned checks: KHIX tests, typecheck, lint, production build, React analysis, formatting, and diff review. Fresh browser screenshots remain blocked by the previously documented URL-policy refusal; the supplied mobile screenshot is the visual baseline.
- Integration audit fixed map initialization when configuration arrives after the dashboard, touch interruption of camera animation, preservation of manual pan/zoom across drawer resizing, and room focus near map edges. Static CSS audit found zero missing/unused map classes; desktop and mobile controls retain 44px targets. Mobile-only passive hints and decorative control corners are removed.

## Requested room coverage — October 5 follow-up

- Owner supplied a three-day room roster and clarified coverage/names only, excluding booking-hour presentation. Three agents independently audited SU/Business, Engineering, and HEC against the source plans and primary UCF references.
- Added an app-local directory of all 42 unique rooms, with location suggestions and Student Union names. Leading-zero numbers and named/combined ballroom aliases now work across lookup, schedule plotting, room activity, and presentation. A single ballroom section does not permit adjacent sections; organizer configuration remains the source of room access.
- Imported verified ENG2 floor 3, including 302 and source-labelled bathrooms 306/307. All previous floors and ten native wall assets remained byte-identical in the Engineering import, and two Engineering rebuilds were deterministic. The map now has 18 floors, with HEC limited to its continuous first floor.
- SU 232 uses the owner's supplied number at the existing source-defined Starbucks anchor. The importer records this override explicitly and retains a point marker because the original food-court boundary is ambiguous. It removes the redundant source Starbucks caption; the app supplies the room name.
- Coverage result: 38 requested rooms have mapped source positions. HEC 103, 110, 111 and 125 are listed and suggested but lack verified coordinates in the supplied scan. They show a clear building-level fallback and never create an inaccurate indoor position marker. HEC 125's inferred lecture-hall polygon is still not published as an official lookup alias. Importer README links the corroborating UCF room-name/identity sources.
- Final validation: all 171 KHIX tests passed, app typecheck passed, app lint passed with existing warnings, app formatting passed, production build passed using the same local nonsecret portal placeholders, React analysis passed (16 tracked changed files plus a separate check of the new drawer), and diff checks passed. Inspected regenerated ENG2 floor 3 and SU floor 2 geometry previews; these are standalone drawings, not browser screenshots. Browser visual verification remains blocked by the prior URL-policy refusal.
- All changes remain local and uncommitted on `blade/khix-map-room-access-pr` for the owner's continued work on PR #594. Completing exact HEC placement requires a numbered first-floor source or authoritative position confirmation for the four remaining rooms.

## Booked-room presentation — October 5 follow-up

- Owner requested showing only the supplied room roster and marking other rooms as unavailable. The 42-room directory now bounds KHIX labels/activity, with organizer restrictions able to narrow it further. No booking hours, database updates or shared editor behavior changes.
- Retained unbooked outlines under muted diagonal stripes and changed the key to Unavailable / Event room. Known bathrooms and wayfinding remain visible; source captions for unbooked spaces and temporary IDs are hidden. Manual lookup and event navigation for an unbooked number show the building instead of advertising an indoor destination.
- Fixed a related selection leak: unavailable rooms cannot receive event/selected attributes or event-detail interactions. Shared envelopes expose only booked aliases and ignore activity attached to their unbooked aliases.
- Initial targeted validation: all 176 KHIX tests passed. Full repository checks and branch push are in progress at the owner's request; fresh browser screenshots remain blocked by the existing URL policy.
- Owner immediately clarified that room numbers must remain. All verified room numbers now stay visible, including on striped/unavailable rooms and shared outlines; only availability/activity is limited by the roster. Unavailable numbers use a muted but readable treatment. Numeric source captions remain too; no unverified HEC placements or official numbers were invented.

- Added ENG2 103 after the owner confirmed the building. It uses the existing verified first-floor polygon. The final roster contains 43 rooms, with 39 mapped positions and the same four unplaced HEC numbers. A regression check keeps ENG1 103 unavailable.

## October 5 release validation

- Owner authorized the full check pass, commit and push to the existing maps PR branch. Final roster: 43 identities including ENG2 103; all verified room numbers stay visible, and unavailable rooms receive diagonal stripes.
- Bundled the reviewed SVG/JSON inputs under the app importer so map regeneration is reproducible without local review exports. Source PDFs, scratch previews and local fixtures remain uncommitted. Two consecutive rebuilds reproduced all 12 generated outputs.
- Repository format, lint, workspace lint and all 33 typecheck tasks passed. Lint has warnings only; workspace lint reports the existing missing `apps/khix/package.json`. React analysis passed for 17 changed files with zero failures.
- All 2,960 tests passed across 29 tasks; all 21 production build tasks passed using nonsecret CI example settings and an isolated PostgreSQL 16 instance. Fresh and repeated migrations passed; generation produced no migration diff. Initial concurrent Blade UI timeouts and one native judging solver timeout cleared on the final run with workspace concurrency 1 and two Vitest workers; no checks or assertions were weakened.
- Supplied screenshots, source drawings and standalone floor previews were reviewed. The browser URL policy still blocks fresh live desktop/mobile verification; no new application screenshot or manual interaction pass is claimed. HEC 103/110/111/125 remain the only unplaced requested rooms.
- No deployment or main push is authorized by this release step; delivery remains PR #594 on `blade/khix-map-room-access-pr`.

## Confirmation-document reconciliation — October 5

- Parsed all explicit room references from the owner's pasted confirmation document and compared them with the app directory: 46 unique rooms, zero missing and zero extra. Added BA1 107, BA1 239 and HEC 101; ENG2 102/103 were already present. Booking hours, capacities and operational action items remain outside map coverage scope. The original attachment is not committed.
- All three additions use existing source geometry. Final coverage is 42 mapped rooms plus HEC 103/110/111/125 as explicit building-level fallbacks. Preserved verified numbers on striped/unavailable rooms.
- Corrected source-labelled stair/lift envelopes so a temporary authoring ID does not make them unavailable; unverified lecture-room envelopes remain unavailable. Added regression coverage.
- Combined final state (including main's landing-page fix at `63d09901`) passed repository format/lint/typecheck, all 2,968 tests (186 KHIX), and all 21 production build tasks. React analysis passed with zero failures. Existing lint/workspace warnings and the live-browser policy limitation remain as recorded above.
