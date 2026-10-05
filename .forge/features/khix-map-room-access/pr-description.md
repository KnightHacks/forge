Give confirmed KHIX hackers a full-page campus and indoor map, while letting organizers control room access from Blade.

Closes #581.

- Add a Blade editor for permitted rooms, optional names and a separate restriction toggle, backed by audited, hackathon-scoped API/SDK contracts. Events never grant room access; unavailable rooms retain their numbers with diagonal stripes and known bathrooms remain available.
- Place Map below Hacker’s Guide. Navigation, the route and the participant API unlock it for confirmed/checked-in hackers on the event’s first local calendar day.
- Rebuild 18 floors across BA1, BA2, Engineering I/II, Student Union and HEC. Include reproducible source drawings, native wall assets, larger labels, named ballroom aliases and all 46 confirmed room identities plus BA1 Atrium, including ENG2 103, BA1 107/239 and HEC 101. BA1 Atrium uses source anchor 128, and its source-defined hallways/stairs remain unhatched. Only the supplied roster receives available-room styling and activity, while organizer restrictions can narrow it further. Booking hours do not change room access.
- Use compact mobile controls, a single Live now/Upcoming event drawer, measured camera fitting, direct pan/pinch gestures and reduced-motion support. Add the Garage C parking callout and require an explicit action before showing the user's location.

Migration `0059_needy_menace.sql` adds per-hackathon map configuration and preserves main’s `0058_fresh_zombie` migration. Deploy the migration and API before the frontend. No dependency or environment-file changes.

## Validation

- All 2,968 tests passed across 29 workspace tasks, including 186 KHIX, 1,078 API, 895 Blade, 159 database and 57 SDK tests. The final run used one workspace task at a time and two Vitest workers after local timing failures under load; no test deadlines or assertions were weakened.
- Repository format, lint, workspace lint, typecheck and all 21 production build tasks passed. Lint has warnings, no errors; workspace lint retains the existing missing `apps/khix/package.json` warning.
- React analysis passed for all 17 changed files, with zero failures.
- Fresh PostgreSQL 16 migrations and repeat application passed; migration generation produced no diff. Map regeneration reproduced all generated outputs.
- GitHub CI results are tracked on this PR. Production deployment remains gated to main.

## Limits and visual evidence

Forty-two requested rooms have verified map positions. HEC 103, 110, 111 and 125 remain building-level fallbacks until their coordinates are confirmed; HEC includes only its continuous first floor. Historical source plans simplify some boundaries and do not define navigable door connections. Bathroom metadata beyond verified source labels remains follow-up work.

Updated standalone floor drawings were inspected. Fresh desktop/mobile browser verification was blocked by the computer-use URL policy, so the existing [October 3 screenshots](https://github.com/KnightHacks/forge/tree/8106fb2ddc7d21f0e4718efbd18915ee791e0c26/.forge/features/khix-map-room-access/screenshots) are historical evidence, not screenshots of the current mobile map. The Blade editor remains represented below.

![Blade room access editor](https://raw.githubusercontent.com/KnightHacks/forge/8106fb2ddc7d21f0e4718efbd18915ee791e0c26/.forge/features/khix-map-room-access/screenshots/03-blade-room-editor.jpg)

BA1 Atrium follow-up: all 192 KHIX tests and repository formatting, lint and type checks passed.
