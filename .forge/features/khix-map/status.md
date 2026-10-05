# KHIX Venue Map Status

Current phase: Validation

## Local restoration and cleanup — 2026-09-21

- Fast-forwarded `khix-map` to `origin/main` at `d1cc69c0` (13 commits).
- Restored 36 source, test, and feature-documentation files from stash
  `f689086e31227e7b897b4c5b707211031f670895`; the full stash is retained.
- Excluded 355 generated logs, screenshots, PDF/image exports, tracing scripts,
  and experiments, plus an unrelated 2025 sponsor SVG edit. Runtime geometry
  remains in `venue-*.generated.ts`; it has no dependency on those artifacts.
- Resolved the shared navigation conflict by keeping both Map and main's Judging
  destination. Judging still requires check-in even though schedule access is
  restored for confirmed participants.
- Restored the existing dashboard accessibility work and route metadata with
  their feature bundle. No new dependencies, environment configuration, database
  operations, or event-date changes were made.
- Current validation: `pnpm format`, `pnpm lint` (warnings, no errors),
  `pnpm typecheck`, `pnpm analyze:react:changed`, and
  `pnpm --filter=@forge/2026 build` passed. Root typecheck includes all API/SDK
  consumers; the build's existing typecheck skip was covered by that separate run.
- Tests passed: 33 venue tests, all 37 Hacker SDK tests, and 5 API participant
  policy tests. The database lifecycle suite was retained but not run because
  it provisions a database; no database operations were authorized in this task.
- Local dev server is running on port 3007. Playwright loaded `/dashboard/map`
  with title `Map | Knight Hacks IX`; the session boundary then displayed
  `Secure sign-in did not load.` because local Blade is unavailable. Authenticated
  map visuals and live schedules were not reverified in this restoration pass.
- Fresh check logs and Playwright output were written outside the repository
  under `/tmp`. Final feature diff: 36 files; no commit or push made.
- Historical results below describe earlier work.

## Label overlap and atrium placement — 2026-09-08

- Moved ENG2 check-in label to (355, 805), below the stairs and between the west/south entrances; split check-in and atrium onto two lines. Verified visually in the running map.
- Counter-rotated room and wayfinding labels; reduced heavy text halos and mobile label inflation; show full campus building names only at closer zoom.
- Room boundaries are unchanged. This fixes label presentation, not an architectural audit of every supplied floor polygon.
- Floor-plan tests: 20 passed, including a check-in placement regression assertion.

## Schedule access after confirmation — 2026-09-08

- User approved schedule access for confirmed and checked-in participants; accepted/pending remain locked.
- Updated Blade getSchedule guard/capabilities, SDK query gate/capability hints, and KHIX event navigation/map polling/lock copy together. Attendance and points remain checked-in-only.
- Earlier checked-in-only schedule notes below are superseded. No database records, confirmation states, or event fixtures were changed in the running app.

## Automatic session connection — 2026-09-08

- Removed development-only map authentication bypass and its obsolete test. Map now uses the shared portal auth boundary/session hook in every environment; there is no separate connect-dashboard action.
- Removed misleading connection copy. Existing Blade check-in policy still governs schedule access.
- Local Blade origin was confirmed as localhost:3000 and initially returned ECONNREFUSED; this blocks session validation independently of the map.

## Event-to-room affordances — 2026-09-08

- Event rows explicitly offer Show room, with keyboard/hover/pressed feedback. Selected events take priority when several events share a room, so the tapped event highlights its polygon reliably.
- Selected rooms have a distinct outline and LIVE/HERE badge. Unmapped room destinations fall back to their building with explicit disclosure; no fabricated room locations or events.
- Blade-backed schedule and permissions remain unchanged. Live-data click-through is not verified in the disconnected local preview; no synthetic events were added.

## Camera framing correction — 2026-09-08

- Restored campus viewport sizing after a full-canvas fit exposed too much peripheral map geometry.
- Floor entry/reset fits measured floor geometry with rotation and padding, rather than the blank 1000×700 canvas. Leaving a floor preserves the previous campus center with a wider local view instead of resetting to campus origin.
- Browser inspected ENG1 full-floor entry and zoom-out to campus. No event simulation used.

## Production cleanup — 2026-09-08

- Removed all synthetic event data, demo state, controls and styles at user request. Earlier demo notes below are historical only.
- Schedule source remains useHackerDashboardFlow → useHackerSchedule → shared Hacker SDK getSchedule → Blade through the configured Next handler. Existing checked-in access policy is preserved.
- Sheet defaults compact; disconnected/check-in/loading states are distinguished. Added a floor-transition cooldown for wheel gestures and a one-transition-per-pinch guard to prevent repeated floor switching and stale pan coordinates.
- No event simulation/testing in this pass; validation is scoped to UI interaction and static checks.

## Live-room clarity — 2026-09-08

- Live rooms use a bright filled polygon plus upright LIVE badge; campus buildings display their live-event count. Ended events are excluded from the interactive map, and current events take priority when a room has several schedule entries.
- Event sheet starts expanded for discoverability. A development-only, explicitly labeled demo event lets local reviewers test the room-selection flow without backend writes or invented production events.
- Camera targeting now applies the floor-plan rotation when centering a room. Verified demo ENG1 224 opens floor 2 and visibly centers the highlighted room.
- Event clock advances independently of schedule-fetch permissions. Schedule permissions are unchanged.

## Mobile interaction pass — 2026-09-08

- Added a bounded, collapsible event sheet using the existing schedule, with local-preview and unavailable states. Event rows focus their destination.
- Added eased camera transitions (reduced-motion aware), proportional wheel zoom, and dragging from building surfaces with drag-click suppression.
- Moved phone controls to the side and reduced campus labels to building codes.
- Map/floor tests: 32 passed. Targeted ESLint: no errors, two file-size warnings.
- App typecheck blocked by shared API/validator/consts type errors after main alignment.
- Browser verified event-sheet expansion and ENG2 indoor entry. Actual multitouch hardware, populated live schedules, and exact 320px rendering still need validation; browser viewport override did not report the requested width reliably.

## Decision log

- 2026-08-26: Limit the occupied footprint to ENG1, BA1, and BA2; show Student
  Union and HEC as orientation landmarks.
- 2026-08-26: Reuse the checked-in Hacker schedule; no API/schema changes.
- 2026-08-26: Use UCF Campus Map coordinates/footprints as the geographic source.
- 2026-08-26: Treat browser geolocation as approximate outdoor orientation and
  require explicit user selection for indoor location.
- 2026-08-26: Reconstruct each indoor floor as independent room geometry from
  the supplied BA1, BA2, ENG1, ENG2, and Student Union floor plans; never embed
  or serve the source PDFs.
- 2026-08-26: Keep Map visible to every signed-in dashboard user on this branch;
  do not change the existing schedule permission, database, or hackathon dates.
- 2026-08-26: Treat campus and indoor floors as semantic zoom levels on one map
  surface. Click centers a building; scroll/pinch enters and exits indoor floors.
- 2026-08-26: Keep ENG1, BA1, and BA2 as the only occupied KHIX buildings;
  Student Union and ENG2 remain glowing orientation landmarks with indoor maps.
- 2026-08-26: Expose only the supported ENG2 floor plans (floors 1 and 2); do
  not show floors 3 or 4 in the map controls.
- 2026-08-26: Remove the unused ENG2 first-floor southeast room cluster
  (116-series, 117-series, 190, and 194) while preserving the surrounding
  atrium and walkway geometry.
- 2026-08-26: Allow `/dashboard/map` to render without Blade only in local
  development so map review never touches the database; production access
  remains behind the existing portal authentication boundary.

## Open questions

- Confirm final event-week food/help rooms before production deployment.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Treat the explicit build request and stated venue scope as approval for the
      first implementation slice.
- [x] Implement venue data and location parsing.
- [x] Implement dashboard route, navigation, and interactive map.
- [x] Reconstruct BA1, BA2, ENG1, ENG2, and Student Union indoor floors.
- [x] Add targeted floor-plan and map tests.
- [x] Complete repository-wide format, lint, typecheck, React analysis, and KHIX build.

## Validation / commands

- `pnpm --filter=@forge/khix exec vitest run src/lib/venue-floor-plans.test.ts src/lib/venue-map.test.ts`
  — 32 tests passed.
- `pnpm --filter=@forge/khix typecheck` — passed.
- `pnpm --filter=@forge/khix format` — passed.
- `pnpm --filter=@forge/khix lint` — passed with 0 errors and 23 existing
  warnings.
- Playwright desktop validation — click centers without entering; wheel zoom
  enters SU/ENG2 and zoom-out returns to campus; all 7 new floors rendered.
- Playwright mobile viewport validation — ENG2 exposes only floor 1 and floor
  2 at 390×844; the removed first-floor room cluster is absent and the browser
  console reports 0 errors.

## Links

- PRs:
- Issues:
- Discord/thread context: User request in Codex task on 2026-08-26.
