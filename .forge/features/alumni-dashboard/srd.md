# Alumni Dashboard SRD

Status: Proposed

## Technical purpose

Add a date-confirmed alumni state to Blade, a protected alumni dashboard data
capability, and an officer-managed bulletin. Preserve the existing date-based
Guild and Discord behavior.

## Relevant principles

- [Product and architecture philosophy](../../../docs/agentic-development/forge-engineering-principles.md#productarchitecture-philosophy)
- [React and Next.js principles](../../../docs/agentic-development/forge-engineering-principles.md#react-and-nextjs-principles)
- [tRPC and API principles](../../../docs/agentic-development/forge-engineering-principles.md#trpc-and-api-principles)
- [Database principles](../../../docs/agentic-development/forge-engineering-principles.md#database-principles)
- [Auth, Discord, and permission principles](../../../docs/agentic-development/forge-engineering-principles.md#auth-discord-and-permission-principles)
- [Configurability principles](../../../docs/agentic-development/forge-engineering-principles.md#configurability-principles)
- [Error-handling and UX principles](../../../docs/agentic-development/forge-engineering-principles.md#error-handling-and-ux-principles)
- [Frontend design-system principles](../../../docs/agentic-development/forge-engineering-principles.md#frontend-design-system-principles)

## Access policy

- Unauthenticated users cannot read alumni dashboard data or bulletin admin
  data.
- Logged-in current members may resolve their own graduation confirmation and
  continue to use normal member settings.
- `getDashboard` returns private alumni data only for the signed-in member when
  their graduation date has passed and they have confirmed graduation.
- Alumni bulletin reads occur through the protected alumni dashboard response.
  No public bulletin API is added.
- Admin reads and mutations require the new
  `MANAGE_ALUMNI_DASHBOARD` permission. The established officer bypass applies.
- Every admin procedure checks permission on the server. Navigation visibility
  is a convenience and does not grant access.
- Blade form response rules continue to apply after an alumnus follows a
  bulletin form action.

## Architecture / data flow

- `@forge/db` adds the nullable member confirmation timestamp and the bulletin
  table, indexes, checks, relations, and migration.
- `@forge/validators` owns graduation-resolution, bulletin create/update,
  ordering, identifier, and image input schemas.
- `@forge/consts` adds `MANAGE_ALUMNI_DASHBOARD` at the end of the permission
  bit map. Existing role bitstrings retain their current meaning.
- `@forge/api` owns alumni eligibility, recap calculations, current-officer
  lookup, bulletin lifecycle, form-link catalog, image storage, and permission
  enforcement.
- Blade owns the authenticated dashboard composition, mandatory dialog,
  bulletin editor, preview UI, and responsive presentation.
- The existing career router remains the owner of member employment editing.
  The alumni query may read the same employment tables for its private summary.
- The event discovery layer remains the source for Club attendance. Alumni
  recap calculations exclude events with a hackathon association.

The dashboard route remains a server component. Its client boundary coordinates
the existing member query with the alumni dashboard query and graduation
mutation. Admin pages follow the same server-side auth and permission pattern
as the current Blade admin routes.

## tRPC/API behavior

Register an `alumni` router in `packages/api/src/root.ts`.

### Member procedures

- `resolveGraduation`
  - Protected mutation.
  - `graduated` requires the saved graduation date to have passed, then stores
    the confirmation timestamp.
  - `extended` accepts a graduation term and year, requires the computed date
    to be in the future, updates `Member.gradDate`, and clears the confirmation
    timestamp.
  - Returns the updated graduation state needed to choose the dashboard.
  - Uses `BAD_REQUEST` for invalid dates, `CONFLICT` when the stored state no
    longer matches the requested resolution, and `NOT_FOUND` when the member
    does not exist.

- `getDashboard`
  - Protected query for a confirmed alumnus.
  - Returns active bulletin items, current officers, recap statistics, private
    career summary, and stable action metadata.
  - Returns `FORBIDDEN` for a current or unconfirmed member and `NOT_FOUND` when
    no member profile exists.
  - Resolves image and profile-picture references to short-lived URLs without
    returning object names.

Any member or admin update that changes `gradDate` clears
`alumniConfirmedAt`. A future graduation date selects the current member
dashboard. A past date requires a fresh confirmation.

### Admin procedures

- `listBulletinAdmin` returns draft, scheduled, active, expired, and archived
  items in display order, with form metadata and image preview URLs.
- `listLinkableForms` returns the minimum identifying data for published Blade
  forms. It does not bypass respondent access.
- `createBulletinPost` creates a validated draft or scheduled/published item.
- `updateBulletinPost` updates content, schedule, state, and action fields.
- `reorderBulletinPosts` applies one complete ordered list in a transaction and
  rejects missing or duplicate IDs.
- `archiveBulletinPost` archives an item without deleting it.
- `restoreBulletinPost` returns an archived or expired item to draft so an
  administrator can review its dates before republishing.
- `uploadBulletinImage` validates and stores one image, replacing any previous
  object only after the database update succeeds.
- `removeBulletinImage` clears the reference before removing the stored object.

Expired published items are derived from `expiresAt <= now`. Member reads omit
them. Admin reads place them in the archive group without requiring a cron
mutation. Restoring an expired item clears its expiration and returns it to
draft.

Procedure names, input schemas, permission requirements, and error messages
must be specific enough for future generated tRPC context.

## Validation

- Bulletin titles are trimmed, required, and limited to 160 characters.
- Markdown bodies are optional and limited to 10,000 characters.
- Image alt text is required when an image exists and limited to 240
  characters.
- CTA labels are required when a CTA target exists and limited to 80
  characters.
- A bulletin item may target one external HTTPS URL or one Blade form. It
  cannot target both.
- External URLs reject unsupported schemes, credentials, and malformed input.
- Publication and expiration values use timezone-aware timestamps.
  `expiresAt` must be later than `publishAt` when both exist.
- Display order values are non-negative integers.
- Bulletin identifiers and form identifiers are UUIDs.
- Graduation resolution reuses the current graduation-term vocabulary and date
  conversion in `@forge/validators`.
- Image input accepts JPEG, PNG, or WebP. Blade compresses and center-crops the
  selected image to the bulletin's 16:9 display ratio before upload. The server
  checks MIME type, file signature, and the 2MB stored-size limit.
- Markdown uses the shared `MarkdownContent` renderer, which skips raw HTML.

## Data / migration / compatibility

Add nullable `Member.alumniConfirmedAt` as a timezone-aware timestamp. Do not
backfill it. Existing alumni must choose a path on their next dashboard visit.

Add `AlumniBulletinPost` with:

- `id`
- `title`
- nullable `body`
- nullable `imageObjectName` and `imageAlt`
- nullable `ctaLabel`, `externalUrl`, and `formId`
- `state`: `draft`, `published`, or `archived`
- non-negative `displayOrder`
- nullable `publishAt`, `expiresAt`, and `archivedAt`
- `createdByUserId`, `updatedByUserId`, `createdAt`, and `updatedAt`

`formId` references `FormsSchemas` with `onDelete: set null`. If a linked form
is deleted, the item remains and its CTA stops rendering until an administrator
chooses another target. User foreign keys use `onDelete: restrict` so authored
content does not lose accountability metadata.

Add indexes for state/order, publication windows, and form references. Database
checks enforce image/alt pairing, CTA target exclusivity, CTA label pairing,
non-negative ordering, and valid schedule order.

The migration is additive. Current `main` ignores the new column and table.
Rollback before bulletin writes may drop both additions. After officers publish
content, rollback must keep the data and disable the new reader and writer
instead of dropping the table.

## Discord integration

- Do not change `apps/cron/src/crons/alumni-assign.ts`.
- Discord alumni role assignment remains based on `Member.gradDate`.
- The Blade confirmation timestamp does not grant or revoke Discord roles.
- Officer cards read current Blade role assignments for `President`,
  `Vice President`, `Secretary`, and `Treasurer`.
- Each officer card links to `https://discord.com/users/<discordUserId>` only
  when a Discord user ID exists.
- The alumni Discord card preserves the current legacy channel URL.

## Configurability review

Would this require a developer change next year?

- Bulletin content, images, forms, links, schedules, order, and archive state are
  officer-managed in Blade.
- Officer occupants change through the existing role assignment system.
- The four office names, shared role emails, alumni Discord channel, and legacy
  Stripe payment links are fixed for this slice because the approved feature
  preserves those established organization endpoints. Changing those endpoints
  requires a developer edit. A general organization-links settings system is
  outside this feature.

## React / frontend constraints

- Read `docs/agentic-development/frontend-design-skill.md` and
  `apps/blade/DESIGN_SYSTEM.md` before implementation.
- Keep `page.tsx` files server-side. Isolate graduation resolution, bulletin
  scrolling, editor dialogs, drag ordering, uploads, and responsive preview in
  focused client components.
- Reuse one bulletin card renderer in the alumni dashboard and admin preview.
- Extend the existing Blade dashboard shell instead of creating a second
  navigation or page chrome.
- On laptop and desktop, fit the content below the 64px Blade header into the
  remaining viewport. The action region uses compact cards and does not scroll
  out of view. The bulletin receives the remaining height with `min-height: 0`
  and `overflow-y: auto`.
- On mobile, render actions before the bulletin and use one document scroll.
- Use dialogs for graduation confirmation and bulletin create/edit flows.
  Avoid new sliding panels.
- The graduation dialog disables escape, outside-click, and close-button
  dismissal.
- Keep action card height, padding, icon spacing, and heading rhythm
  consistent. Optional recap and career content must not create uneven empty
  placeholders.
- Provide matching skeletons for the current dashboard, confirmation state,
  alumni dashboard, bulletin, and admin list.
- Show safe error states with retry paths. Mutations expose pending, success,
  and error feedback and prevent duplicate submission.
- Preserve keyboard ordering, visible focus, image alt text, drag-reorder
  alternatives, reduced-motion behavior, and screen-reader labels.
- Use restrained enter and interaction animation from the Blade motion
  vocabulary. The feature must work with reduced motion.
- Validate the complete dashboard at 1440x900, 1280x720, and 390x844. At
  1280x720, all action surfaces remain visible and only the bulletin scrolls.

## Testing / verification strategy

- `@forge/validators` unit tests cover graduation resolution, bulletin content,
  CTA exclusivity, URLs, schedules, ordering, and image metadata.
- `@forge/db` migration tests cover the nullable member column, bulletin checks,
  foreign keys, and additive upgrade.
- `@forge/api` tests cover eligibility, confirmation, recap derivation, officer
  lookup, career privacy, publication windows, ordering, forms, images, and
  permission failures.
- Blade Vitest tests cover dashboard selection, mandatory dialog behavior,
  optional-stat reflow, bulletin variants, admin editor states, and preview
  parity.
- Blade Playwright covers one graduation path, one admin publication path, and
  the alumni dashboard at desktop and mobile sizes.
- Run targeted tests before `pnpm verify:precommit`,
  `pnpm analyze:react:changed`, the Blade build, migration checks, and
  screenshot-based visual review.

## Open questions

- None. Human approval of this SRD authorizes the schema, permission, upload,
  and dashboard changes described above.
