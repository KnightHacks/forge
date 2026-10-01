# Point Store Status

Current phase: PR review

Branch: `codex/point-store`, created from `origin/main` at `99a8718b`.

## Decisions

- Blade and KHIX changes were explicitly approved together.
- Only `EDIT_HACKERS` grants operator access, including reads. `READ_HACKERS` and officer status alone do not grant access.
- Stores and purchasing power belong to a hackathon. Purchasers must be checked in; stock and spending power cannot be overdrawn.
- Earned points include manual awards and remain unchanged by purchases. KHIX totals and leaderboard use the stored attendee total.
- Items have a name, point price, optional description/image/stock, and archive state. Sizes are separate items. Untracked items have a sold-out switch.
- Purchases support quantity and preserve item, price, hacker, and operator snapshots. Voids retain history, restore spending power once, and optionally restock.
- A void can restock only if the purchase originally decremented stock and the item still tracks it.
- Catalog visibility and store open status are independent. Closed is informational and does not block operator transactions. Pickup location is editable.
- KHIX locks the catalog until check-in and shows earned points, spending power, affordability, availability, and pickup status.

## Progress

- [x] Create task branch and feature bundle; read applicable skills and design systems.
- [x] Reverse-prompt and record accepted requirements, implementation approach, and test cases.
- [x] Implement schema, generated migration, API, validators, SDK, Blade, and KHIX.
- [x] Verify permission boundaries, concurrency, retry safety, stock, voids, image lifecycle, and portal behavior.
- [x] Run the standard Forge review with API/access, data/contracts, and UI/boundary reviewers; no findings.
- [x] Verify `.env` uses `localhost:5433/local`; tests and browser fixtures use separate disposable local databases.
- [x] Capture 15 screenshots using the real local Blade API and KHIX portal session, with synthetic data and no API mocks.
- [x] Finish final static gate and production build after UI polish.
- [x] Open PR with 15 screenshots.
- [ ] Resolve CodeRabbit review and verify its final status.

## Validation

- `pnpm db:generate`: passed. Generated migration applies in disposable PostgreSQL integration tests.
- `pnpm verify:precommit`: passed after final UI polish. Changed React analysis includes all eight touched React files.
- `pnpm build`: passed, 21 tasks including Blade and KHIX.
- API integration, audit, portal contract, and surface tests: 52 passed, including 7 point-store integration tests.
- Hacker SDK: 31 tests passed. Validators: 321 passed. KHIX: 14 passed. Blade admin access/navigation: 10 passed.
- Browser checks exercised item creation, purchase, void/restock, editable location, real participant balances, visibility, open/closed states, and check-in locks.
- Screenshots cover desktop, 390px mobile, and 320px narrow layouts. No horizontal overflow in checked pages.
- Image signature validation, replacement, removal, stale-revision rejection, and cleanup are integration-tested with mocked object storage. External storage was not modified.
- Production migrations and deployments have not been run. Migration 0055 must be applied before deploying the feature.

## Screenshots

Evidence is in [evidence/](./evidence/): nine Blade views and six KHIX views, including item management, settings, checkout, history, voids, mobile forms, catalog affordability, closed/hidden states, and check-in locks.

## Links

- Issue: https://github.com/KnightHacks/forge/issues/585
- PR: https://github.com/KnightHacks/forge/pull/586
