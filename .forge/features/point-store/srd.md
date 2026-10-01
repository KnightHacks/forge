# Point Store SRD

Status: Implementation plan based on accepted product decisions

## Ownership and access

Blade owns organizer UI; apps/2026 owns KHIX UI. API owns transactions and catalog queries. DB owns tables and migrations. Validators and hacker SDK own the shared input/output contracts. Follow Forge engineering principles and the existing Blade design system.

Every organizer endpoint and the Blade page/navigation require EDIT_HACKERS explicitly. The existing generic officer bypass must not grant store access by itself. Hacker reads use portal authentication, its hackathon identity, and checked-in status. Catalog visibility is enforced before returning items or image URLs. No new permissions, external services, dependencies, or Discord side effects are needed.

## Data and transactions

Add store visibility, open status, and location to Hackathon. Add PointStoreItem and PointStorePurchase tables. Items store optional stock, sold-out state for untracked stock, image object key, archive flag, and a revision for stale-edit detection. Purchases retain item/name/price/quantity and actor snapshots, an idempotency UUID, and void/restock metadata. Nullable hacker references preserve history if an application is deleted; balance queries always scope to the current attendee and hackathon.

Purchase and void operations lock the attendee before the item. Purchase checks current status, price, availability, and the sum of non-voided spending in that transaction. Item stock changes and audit writes commit with the purchase. Purchase IDs reject reuse with different input and return the existing result on retries. Item revisions prevent stale forms overwriting concurrent stock changes. Voids remain stored; restocking applies only when the purchase decremented tracked stock and the item is still tracked.

Use HackerAttendee.points for earned totals, including manual adjustments, in the catalog, KHIX points total, and leaderboard. Keep attendance entries as event history. Clamp spendable points at zero after later corrections; never change earned points during a purchase or void.

## Uploads and API

Reuse the shared raster image policy, signature validation, and existing image bucket. Store images in a point-store prefix. Upload before a DB update, clean up on failure, and remove replaced images after commit; storage failures cannot roll back committed catalog edits. Return signed image URLs rather than storage keys to hackers.

Expose a pointStore tRPC router for hackathon choices, workspace reads, hacker search, balance, history, settings, item save, image update, purchase, and void. Add getPointStore to the existing participant API and SDK manifest. Shared Zod schemas constrain text lengths, integer bounds, UUIDs, upload size, and paging. History is paged. Mutation audits and API snapshots cover new procedures.

## Rollout and compatibility

Generate an additive migration. Existing hackathons default to hidden and closed with no location. No points backfill is needed: the existing attendee total already receives event and manual changes. Deploy DB migration before API/Blade, then KHIX. Roll back application code while retaining tables and purchase history; do not drop spending records to roll back a deployment. Existing manual point adjustments become visible in KHIX leaderboard totals by explicit user request.

## UI and verification

Use a server Blade page for the permission gate and hackathon selection, focused client components for forms and transactions, existing tabs/dialogs/toasts, and pending state until refreshed data arrives. Item availability and the hacker's remaining balance stay next to the purchase action. KHIX retains its existing visual language and navigation lock treatment.

Use disposable PostgreSQL tests for permission gates, isolation, race conditions, idempotency, voids, and migration defaults. Verify portal contracts, shared validation, and existing points/leaderboard regressions. Check Blade and KHIX at desktop and mobile widths using actual rendered screenshots. Run formatting, lint, typecheck, and React analysis, followed by scope-derived review.

## Configurability

No yearly developer change is required. Catalog, point prices, stock, location, visibility, and store status are managed per hackathon.

## VIP addendum

Extend the existing `hacker.updateProfile` input with optional `isVip`, split that field from shared profile edits, and write it to the selected `HackerAttendee` in the existing audited transaction. Return it from `hacker.get`, add it to the existing audit field allowlist, and use an uncontrolled checkbox in the current application editor. No schema or procedure additions are needed.
