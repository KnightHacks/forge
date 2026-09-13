# Sponsor and Partner Update Status

Phase: AMD static validation complete; visual validation pending

## Decisions

- User requested temporarily removing Lovable. Removed its homepage roster entry
  and retained its logo asset for later reuse; the active roster has 15 sponsors.
- User requested additions from a supplied roster graphic and a Codex fix.
- Promote AMD to Gold at the user's request; preserve other tiers and
  floating-rock/engraved styling.
- New sponsor placements provisionally follow prominence in the reference.
- Existing Codex SVG is an icon only; add its wordmark.
- Brain-and-gear partner confirmed as Robotics Club of Central Florida (RCCF).
  Its [official site](https://rccf.club/) and
  [official repository asset](https://github.com/RoboticsClubatUCF/Robotics-Club-Website/blob/main/web/src/assets/rccf-logo.png)
  match the supplied mark exactly. AI@UCF was not added.
- Use original official SHPE and RCCF transparent PNGs. ACM uses the existing
  repository's vector geometry and lettering with its raster fill removed.
- Let Team follow the roster's actual height; retain horizontal centering for
  its wider desktop panel and full-width separator.

## Open questions

- New tier placement was asked asynchronously.

## Progress

- [x] Read repo/frontend guidance and inspect current implementation.
- [x] Create 2026/update-sponsors-and-partners task branch.
- [x] Install locked dependencies for verification.
- [x] Source and inspect logos; record partner provenance in the app's public directory.
- [x] Update sponsor/partner roster, Codex lockup, and responsive spacing.
- [ ] Run static checks and existing app tests.
- [ ] Inspect desktop/mobile screenshots and team clearance.

## Validation

- pnpm install --frozen-lockfile: passed, including workspace lint.
- Feature scaffolder ran using Node native TypeScript support after the initial
  pnpm launcher could not resolve inside the sandbox.
- Existing @forge/2026 app tests: 14 passed (run by the parent task).
- Scoped Prettier check: passed (run by the parent task).
- Root validation commands were interrupted under resource pressure; no root
  format/lint/typecheck or changed-React-analysis pass is claimed for this change.
- Lightweight source review identified an overwide Team panel centering issue;
  the parent task confirmed the 54px desktop shift in DOM measurements and
  restored explicit horizontal centering.
- Real desktop/mobile visual validation remains pending, including Codex fit,
  Student Government background blending, tall ACM logo readability, centered
  final partner row, waterfall continuity, and Team clearance.

PR/issue: none created for this task.

## AMD Gold update

- Changed AMD from `silver-moon` to `golden-dawn` on
  `codex/2026-amd-gold-tier`; the existing renderer supplies Gold placement and
  sizing with the same logo and link.
- Scoped Prettier and ESLint passed through the installed Node CLIs. ESLint
  reported the existing informational missing-Pages-directory message.
- Changed React analysis passed via
  `node --import tsx scripts/analyze-react-changed.ts`: two files, zero failures.
- The pnpm wrappers for scoped formatting, typechecking, development, and
  changed React analysis stalled without output and were interrupted (exit 130).
- Direct local development startup succeeded, but the browser displayed
  `Invalid environment variables`; `KHIX_HACKER_PORTAL_CLIENT_ID` is missing.
  Gold placement could not be visually verified.
- Direct app typechecking (`node ../../node_modules/typescript/bin/tsc --noEmit`
  from `apps/2026`) failed with `JavaScript heap out of memory` (exit 134).
- `git diff --check` passed. No commit or deployment was made.

### AMD validation retry

- The supplied commit-hook logs show both typed ESLint and TypeScript exhausting
  Node's default heap, approximately 2 GiB on this machine.
- App typechecking passed with
  `node --max-old-space-size=4096 ../../node_modules/typescript/bin/tsc --noEmit --extendedDiagnostics`
  from `apps/2026`: 4,505 files, 2,285,456 KiB reported memory, 22.64 seconds.
- Scoped ESLint passed with
  `node --max-old-space-size=4096 node_modules/.bin/eslint apps/2026/src/app/_components/sections/sponsor-team/SponsorTeamSection.tsx`.
- Unstaged the local `.pnpm-store` cache files; retained them on disk.
- All three commit-hook checks passed with
  `NODE_OPTIONS=--max-old-space-size=4096 TURBO_ENV_MODE=loose pnpm exec lefthook run pre-commit`:
  formatting, scoped lint, and scoped typecheck with all eight dependency builds
  (nine Turbo tasks passed, none cached). Used the already installed pnpm 9.12.1
  directory first in the command's PATH.
- The heap setting is local to the command. Turbo's loose environment mode
  passes it through to TypeScript; no repository tooling settings were changed.

## Temporary Lovable removal validation

- Source roster check passed: 15 sponsors, with no Lovable entry, link, or logo reference.
- Scoped Prettier check passed via Node; `git diff --check` passed.
- Scoped `pnpm --filter=@forge/2026 exec prettier --check` and
  `pnpm --filter=@forge/2026 exec eslint` commands stalled without output and
  were interrupted (exit 130). Direct ESLint could not run because
  `apps/2026/node_modules/eslint/bin/eslint.js` was missing (`MODULE_NOT_FOUND`).
- `pnpm --filter=@forge/2026 dev` stalled without output and was interrupted
  (exit 130); visual validation remains pending.

## Local verification limit

- The local page rendered the full 16-sponsor / 9-partner roster in the accessibility tree.
- Desktop DOM measurements exposed a 54px Team-panel offset; explicit centering was restored.
- Full desktop/mobile logo screenshots remain unverified: repeated browser debugger synchronization and screenshot timeouts prevented completing the visual pass. Only the section transition screenshot was inspected.
- Scoped app TypeScript check (`node ../../node_modules/typescript/bin/tsc --noEmit`, from `apps/2026`) was interrupted with exit 130 after more than 10 minutes without diagnostics. No typecheck pass is claimed.
- `git diff --check`: passed.
- The local development server and validation processes were stopped after repeated timeouts. No commit or deployment was made.

- A second isolated TypeScript attempt and a scoped ESLint attempt on the two changed TSX files also produced no diagnostics before interruption (exit 130). Formatting of the final source/docs passed; full lint/typecheck/React analysis remain incomplete.

## Commit-hook lint fix

- The commit hook reported `@typescript-eslint/prefer-nullish-coalescing` for
  the logo-background data attribute. Replaced the logical OR with the same
  explicit `"true"`/`undefined` conditional used by the adjacent contrast flag,
  preserving omission when the option is false or absent.
- Scoped ESLint passed for both changed TSX files using the installed CLI with
  a 4096 MiB heap: `node --max-old-space-size=4096 node_modules/.bin/eslint`
  followed by the two component paths. The existing missing-Pages-directory
  message remained informational; ESLint exited 0.
- Scoped Prettier and `git diff --check` passed.
- Changed React analysis passed via `node --import tsx scripts/analyze-react-changed.ts`:
  two files analyzed, zero failures.
- Full root checks and typechecking remain unverified. The latest supplied
  typecheck log ends at the `@forge/api` build without a completion result.
