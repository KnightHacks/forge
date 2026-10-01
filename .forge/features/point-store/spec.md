# Point Store spec

Status: Accepted product decisions, 2026-09-30

## Purpose and users

Organizers with Edit Hackers manage a hackathon's merch and record in-person purchases. Checked-in hackers browse that hackathon's catalog in KHIX. Read Hackers alone grants no store access.

## Interface

Blade adds Point Store under Hacks with Items and Transactions tabs and a hackathon selector. Items have a name, optional description and image, integer point price, and optional stock count. Sizes are separate items. Untracked items have an available/sold-out switch. Organizers can archive items without rewriting past purchases.

Transactions lets an organizer search checked-in hackers, see earned points and spending power, choose an item and quantity, and record a purchase. A void restores spending power, optionally restocks, and remains in history.

Store settings independently control catalog visibility and an open/closed status, plus a configurable pickup location. Closed is an informational status for hackers; it does not prevent organizer purchases.

KHIX adds Merch Store, locked until check-in. When revealed, it shows items, prices, availability, tracked stock counts, affordability, earned points, spending power, store status, and pickup location. Hackers collect purchases from organizers rather than checking out online.

## Point rules

Each hackathon has its own store and spending balance. Earned points include event awards and manual adjustments. KHIX totals and leaderboards use the same earned balance as Blade. Purchases subtract only from purchasing power. Voids restore purchasing power. A later earned-point deduction can leave no spending power; it does not rewrite earlier purchases.

## Acceptance criteria

- A 30-point purchase from 100 earned points leaves 100 earned points and 70 spending power.
- Purchases require a checked-in hacker, sufficient spending power, and available stock when tracked.
- Concurrent purchases cannot overspend or oversell; retrying one purchase does not charge twice.
- Untracked stock is never decremented and can be manually marked sold out.
- Old transactions retain their original item name, price, quantity, hacker, organizer, and time after edits or archiving.
- Voiding a purchase once restores spending power once, with optional restocking.
- Hidden catalogs do not expose items through the hacker API. Unchecked hackers cannot fetch catalog data.
- All configuration belongs to the selected hackathon and can be managed next year without code changes.

## Out of scope

Online checkout, cash payments, reservations, size variants within one item, shipping, and Discord announcements.

## Open questions

None blocking. Implementation choices and verification are tracked in the SRD and status.
