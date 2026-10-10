# 3D Printing Queue SRD

Status: Draft, awaiting human approval

## Technical purpose

Add a hackathon-scoped print job queue. Checked-in hackers submit and track jobs
through the Hacker SDK. Blade organizers with `PRINTING_QUEUE` work the queue.
Forge stores jobs, staged files, and per-hackathon settings (Discord channel,
print time, printer count). Estimated ready times are computed when jobs are
read, never stored, except for an optional organizer override. Discord and email
notifications run after the database commit and report a separate delivery
result.

## Relevant principles

- Apps are thin clients. Workflow and access live in `@forge/api`, both in the
  Blade router and in `hacker-portal/`.
- KH IX reaches Blade only through `@forge/hacker-sdk` and its same-origin
  adapter. Never accept a hackathon ID from the browser.
- `@forge/db` owns schemas and migrations only. Follow the
  `.claude/skills/postgres-drizzle` table shape.
- Keep Discord, email, and MinIO work outside database transactions.
- The Discord channel is officer-managed data, not a constant.
- Blade follows `apps/blade/DESIGN_SYSTEM.md`. KH IX keeps its CSS modules.

## Access policy

- **Unauthenticated:** no access to any printing procedure or route.
- **Portal participant, not checked in:** `listPrintJobs`, `submitPrintJob`,
  `cancelPrintJob`, `removeStagedPrintFile`, and the upload route refuse with
  `FORBIDDEN_STATUS`. KH IX locks the tab from `application.status`, the same
  way it locks Events.
- **Portal participant, `checkedin` for the session's hackathon:** can upload
  staged files, submit, list their own jobs, and cancel their own `received` or
  `needs_clarification` jobs. The hackathon and hacker come from the portal
  session, never from input. Every file and job lookup is scoped by
  `(hackathonId, hackerAttendeeId)`.
- **Blade user with `PRINTING_QUEUE` or `IS_OFFICER`:** every `printing.*`
  procedure. This is capability-only; there is no row scope.
  `requirePrintingQueue` in `utils/printing/access.ts` calls
  `permissions.controlPerms.or(["PRINTING_QUEUE"], ctx)` before any work.
- **Page gate:** `apps/blade/src/app/admin/printing/page.tsx` redirects with
  `canAccessPrintingQueue`. The nav item is UX only.

## Architecture and data flow

| Layer               | Owns                                                                                                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@forge/consts`     | `PRINTING_QUEUE` at permission index 28 (append only), `PRINT_JOB_STATUSES`, cancellable statuses, active statuses, estimate defaults and bounds, `MINIO.PRINT_FILES_BUCKET_NAME` |
| `@forge/db`         | `PrintJob` (with `estimatedReadyAt`), `PrintJobFile`, `PrintingConfiguration` (with `printMinutes`, `printerCount`), relations, migration 0055 (amended)                          |
| `@forge/validators` | Blade inputs in `printing.ts`, print-file upload policy in `upload-policy.ts`, participant schemas in `hacker-portal.ts`, audit catalog entries                                   |
| `@forge/api`        | `routers/printing.ts`, `utils/printing/{access,status,files,notifications,estimate}.ts`, participant procedures in `hacker-portal/`                                               |
| `@forge/email`      | `printJobStatusEmail` template                                                                                                                                                    |
| `@forge/hacker-sdk` | contract entries, `uploadPrintFile` client method, hooks, adapter prefix                                                                                                          |
| `apps/blade`        | nav, page, queue dashboard, upload route handler                                                                                                                                  |
| `apps/2026`         | rail unlock, printing page, form, job list                                                                                                                                        |

### Submission flow

1. The hacker picks files. The SDK checks type and size, then uploads each file
   in its own multipart request: `/api/hacker-sdk/printing/upload`, then the
   adapter, then Blade `/api/hacker/v1/printing/upload`.
2. The Blade route reads a bounded body (52 MB), authenticates the portal
   session, and calls `uploadPrintFile`. That function checks `checkedin`,
   validates the file against the policy, writes the object to MinIO, and
   inserts a `PrintJobFile` row with a null `printJobId`. It returns
   `{ fileId, fileName, size }`. If the insert fails, it removes the object.
3. `submitPrintJob({ description, fileIds, idempotencyKey })` checks `checkedin`.
   In one transaction it inserts the `PrintJob` and claims 1 to 5 staged files
   that belong to this hacker and hackathon, updating only rows where
   `printJobId IS NULL`. It fails if any file is missing, already claimed, or
   belongs to someone else.
4. After the commit, it posts the new-job channel notice and returns the job
   with `channelDelivery`. The hacker never sees that field.
5. `cleanupAbandonedPrintFiles` in `@forge/api/utils` deletes staged files
   still unclaimed after 24 hours, both rows and objects. This PR ships and
   tests the function but does not schedule it. A follow-up adds
   `apps/cron/src/crons/print-file-cleanup.ts`, mirroring
   `form-attachment-cleanup.ts`. Until then, abandoned staged files stay in
   MinIO.

### Status update flow

1. `printing.updateStatus({ jobId, status, note })` runs the guard and loads the
   job with its hackathon.
2. In a transaction it updates `status`, `statusNote`, `statusChangedAt`, and
   `statusChangedByUserId`, and writes the `printing.job.status_updated` audit
   event.
3. After the commit, it sends the Discord DM and the email in parallel, each
   caught on its own. It returns
   `{ job, delivery: { discord, email } }`, where each value is
   `"delivered" | "failed" | "not_configured" | "skipped"`.
4. Setting the same status with the same note is a no-op that sends nothing.
5. Moving a job to a status outside `PRINT_JOB_ACTIVE_STATUSES` clears
   `estimatedReadyAt` in the same update, so a stale override never comes back
   if the job is later returned to the queue.

`updateStatus` returns `{ changed, job, delivery }`. A no-op returns
`changed: false` with both deliveries `"skipped"`. Audit coverage lists
`updateStatus` as hybrid because the no-op path writes no event.
`getFileDownloadUrl` is a mutation because it writes an audit event.

### Ready-time estimate flow

`utils/printing/estimate.ts` exports one pure function:

```ts
estimateReadyTimes(
  activeJobs: { id; status; createdAt; statusChangedAt; estimatedReadyAt }[], // oldest first
  settings: { printMinutes; printerCount },
  now: Date,
): Map<jobId, { position: number; estimatedReadyAt: Date; overridden: boolean }>
```

- Active jobs are `received` and `printing` (`PRINT_JOB_ACTIVE_STATUSES`) for
  one hackathon, ordered by `(createdAt, id)` so ties are stable.
- `position` = index in that list + 1.
- `received`: `now + ceil(position / printerCount) * printMinutes`.
- `printing`: `statusChangedAt + printMinutes`. The client shows "any minute
  now" when that is in the past.
- A non-null `estimatedReadyAt` on the job wins, with `overridden: true`.
- Settings come from `PrintingConfiguration`, falling back to
  `PRINTING.DEFAULT_PRINT_MINUTES` (60) and `PRINTING.DEFAULT_PRINTER_COUNT` (1)
  when no row exists.
- Callers load the active jobs with one indexed query on
  `knight_hacks_print_job_queue_idx`. A hackathon queue is tens of jobs, so the
  function scans the whole list. If queues reach thousands, switch to a window
  function (`row_number()`) in SQL.
- `now` is passed in so tests are deterministic and both apps see server time.

Nothing is stored or scheduled. Estimates change only because the queue changed,
and every read recomputes them.

## tRPC/API behavior

### Blade router `printing` (all `permProcedure`)

| Procedure             | Input                                                  | Output                                                                                         | Audit                                                    |
| --------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `list`                | `{ hackathonId, status?: PrintJobStatus \| "active" }` | jobs oldest first, with submitter contact, file metadata, cancel count; plus per-status counts | excluded (read)                                          |
| `getFileDownloadUrl`  | `{ fileId }`                                           | presigned GET URL valid for 10 minutes, `attachment` disposition                               | audited, matching the form-attachment download precedent |
| `updateStatus`        | `{ jobId, status, note? }`                             | job and delivery result                                                                        | audited                                                  |
| `getConfiguration`    | `{ hackathonId }`                                      | `{ channelId \| null, printMinutes, printerCount }` (defaults when no row)                     | excluded                                                 |
| `listDiscordChannels` | none                                                   | guild text channels                                                                            | excluded                                                 |
| `setChannel`          | `{ hackathonId, channelId \| null }`                   | configuration                                                                                  | audited `printing.channel.updated`                       |
| `setEstimateSettings` | `{ hackathonId, printMinutes, printerCount }`          | configuration (upsert)                                                                         | audited `printing.estimate_settings.updated`             |
| `setEstimatedReadyAt` | `{ jobId, estimatedReadyAt \| null }`                  | job; sends no notification                                                                     | audited `printing.job.estimate_updated`                  |

All of these go in `utils/audit/coverage.ts` under the router file name
`printing.*`. The new action keys go in `AUDIT_ACTION_CATALOG` under the
`hackathons` domain. The api-surface snapshot and namespace list get `printing`.

### Participant procedures (`hacker-portal/`)

| Procedure               | Tier                     | Notes                                                                                                                                                                                                   |
| ----------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listPrintJobs`         | participant, `checkedin` | own jobs, newest first, with file names, the organizer note, and `position` / `estimatedReadyAt` for active jobs; plus `queue: { waitingCount, printMinutes, estimatedWaitMinutes }` for the disclaimer |
| `submitPrintJob`        | participant, `checkedin` | idempotent through the existing participant command pattern                                                                                                                                             |
| `cancelPrintJob`        | participant, `checkedin` | `{ jobId, idempotencyKey }`; refuses if not cancellable                                                                                                                                                 |
| `removeStagedPrintFile` | participant, `checkedin` | `{ fileId }`; deletes only an unclaimed file owned by the caller. Repeating it is harmless, so it takes no idempotency key                                                                              |

`submitPrintJob` and `cancelPrintJob` follow the existing `hacker-portal`
command pattern for idempotency and write `printing.job.submitted` and
`printing.job.cancelled`. The upload route is not idempotent: a retried upload
stages a second copy, and the abandoned-file cleanup removes whichever one is
never claimed.

`getDashboard.allowedActions` does **not** gain a printing action (changed
2026-10-01). The SDK parses outputs strictly, so a new enum value from Blade
would break an older KH IX deploy's dashboard until it is redeployed. KH IX
already unlocks Events from `application.status === "checkedin"`, and the
printing tab does the same. The server still enforces check-in on every
procedure.

Errors use the existing portal error codes where they fit (`FORBIDDEN_STATUS`,
validation issues) and add `INVALID_PRINT_FILE`, `PRINT_JOB_NOT_CANCELLABLE`,
and `PRINT_FILE_UNAVAILABLE`. Messages shown to hackers never include storage,
Discord, or database details.

## Validation

- Description: trimmed, 1 to 2,000 characters, must contain a non-space
  character.
- Files per job: 1 to 5.
- Note: trimmed, up to 500 characters. An empty string is stored as null. A
  note is **required** when the new status is `needs_clarification`, and
  optional for every other status. The shared Blade input schema enforces this
  with a refinement, so the form and the server reject the same input.
- Per-hacker job count: no limit.
- `printMinutes`: integer, 5 to 600. `printerCount`: integer, 1 to 20. Bounds
  live in `@forge/consts` and the database checks repeat them.
- `estimatedReadyAt` override: a date in the future at save time, at most 7
  days out, or `null` to clear. Allowed only while the job is `received` or
  `printing`.
- Status: one of `PRINT_JOB_STATUSES`. Organizers may set any status. Hackers
  can only move their own job to `cancelled`, and only from
  `received` or `needs_clarification`.
- Upload policy: 50 MB maximum per file. Allowed extensions are `.stl`,
  `.3mf`, `.obj`, `.step`, `.stp`, `.png`, `.jpg`, and `.jpeg`. The stored
  content type comes from the extension, never from the browser. Magic bytes are checked where the format
  has them: 3MF is a ZIP (`PK\x03\x04`), STEP starts with `ISO-10303-21`, and
  PNG and JPEG have their standard signatures. STL and OBJ have no reliable
  signature, so they are limited by extension and size. File names are
  sanitized before they reach the object name or a download header.
- Implementation (2026-10-01): `PRINT_FILE_UPLOAD_POLICY` sets
  `typeFrom: "extension"`, a new optional policy field that makes the shared
  check ignore the browser's declared type (Windows reports `.stl` as
  `application/vnd.ms-pki.stl`). STL and OBJ "signatures" refuse executable
  images, which is the only content check those formats allow. File names
  reuse `safeFileName` from form attachments.
- Objects are stored as `print-jobs/<hackathonId>/<hackerAttendeeId>/<fileId>-<safeName>`.
  Hackers never see object names.

## Data, migration, and compatibility

New tables, all additive:

- **`knight_hacks_print_job`:** `id`, `hackathonId` (cascade), `hackerAttendeeId`
  (cascade), `description`, `status` (text enum with a check constraint, default
  `received`), `statusNote` (nullable), `createdAt`, `statusChangedAt`,
  `statusChangedByUserId` (nullable, set null), `estimatedReadyAt` (nullable
  timestamptz, organizer override). Index on
  `(hackathonId, status, createdAt)` for the queue, and on
  `(hackerAttendeeId, createdAt)` for the hacker list.
- **`knight_hacks_print_job_file`:** `id`, `printJobId` (nullable, cascade),
  `hackathonId`, `hackerAttendeeId`, `objectName` (unique), `fileName`,
  `contentType`, `size`, `createdAt`. Index on `printJobId`, and a partial index
  on `createdAt` where `printJobId IS NULL` for cleanup.
- **`knight_hacks_printing_configuration`:** `hackathonId` (primary key,
  cascade), `discordChannelId varchar(20)` (nullable, snowflake check),
  `printMinutes integer not null default 60` (check 5 to 600),
  `printerCount integer not null default 1` (check 1 to 20), `updatedAt`.

**Migration decision (2026-10-01): amend 0055 instead of adding 0056.** 0055
is only on `blade/3d-printing-queue`, has no PR, is not on `main`, and was
applied only to disposable test databases. A 0056 that alters tables nobody
has deployed would leave two migrations for one feature for no benefit.
Procedure: remove `0055_fresh_zombie.sql`, `meta/0055_snapshot.json`, and the
0055 journal entry, update the schema, then run
`pnpm with-env drizzle-kit generate --name fresh_zombie` from `packages/db`
(the `generate` script chains prettier, so extra arguments would land on
prettier), then format `drizzle/meta/*.json`. That keeps the tag the lineage
test pins. A developer database that already ran the
old 0055 has to be reset, because Drizzle will not re-run a migration it has
already recorded. Once 0055 reaches `main` or any shared database, later changes
go in a new migration.

**Update (2026-10-01, after review): the migration is now 0058.** `main`
merged its own 0055 to 0057 while this branch was open, so the branch was
rebased onto `main` and the printing migration regenerated as
`0058_fresh_zombie` (same three tables, `prevId` pointing at main's 0057). The
lineage test now expects 59 entries. Any database that applied the old branch
0055 must be reset: Drizzle only applies migrations newer than the last one it
recorded, and the old 0055 is dated after main's 0055 to 0057, so it would
silently skip them.

Adding the permission needs no migration. Existing role bitstrings are shorter
than 29 characters, and every reader treats a missing bit as false.

Rollout: generate and apply the migration, deploy Blade, then deploy KH IX. The
portal tolerates an older Blade: unknown procedures fail as a normal load error.
Rollback: revert the app deploys. The tables are unused without the code, and
dropping them needs a new forward migration.

The MinIO bucket is created on first use, like the existing buckets. Deleting
files after the hackathon is out of scope.

## Discord integration

- **Channel:** `PrintingConfiguration.discordChannelId`, chosen from the guild's
  text channels, which are resolved through `getKnightHacksGuildId()`. Saving
  validates that the channel belongs to the guild. Blade tells organizers the
  channel should be private.
- **New-job notice:** "New 3D print job from {name}, submitted {time}", with a
  link to the Blade queue. It mentions the Discord role of every `Roles` row
  whose bitstring has `PRINTING_QUEUE` set, via `roleHasPermission`. A role
  that grants only `IS_OFFICER` is not mentioned: officers can open the queue,
  but only roles explicitly given `PRINTING_QUEUE` are pinged. It sends
  `allowed_mentions: { parse: [], roles: [...] }` (at most 100 roles), runs the
  name through `escapeMarkdown` (which also neutralizes mentions), and links
  to `${BLADE_URL}/admin/printing`. The time is Discord's `<t:…:f>` markup, so
  each reader sees their own time zone. A replayed submit (same idempotency
  key) does not post again. No nonce: nothing retries the post.
- **DM:** `POST /users/@me/channels` with `{ recipient_id }`, then post the
  message. The recipient is the `User.discordUserId` behind the hacker.
  `allowed_mentions: { parse: [] }`. A 403 (DMs closed) returns `"failed"`.
- Everything lives in `utils/printing/notifications.ts` and calls
  `@forge/utils/discord` directly. There is one implementation, so tests mock
  that module rather than going through a gateway interface.
  `notifyNewPrintJob` and `notifyPrintJobStatus` never throw.

## Email

`printJobStatusEmail({ hackathonName, headline, name, note, portalUrl, readyAt, statusLabel })`
(in `@forge/email/src/print-job.ts`, styled like the project-claim email) returns
`{ subject, html, text }`, escapes every input, and is sent with `sendEmail` to
the hacker's current profile email. `estimatedReadyAt` is passed only for
`received` and `printing`. The email and the DM both link to the KH IX
printing page at `{HackathonPortalClient.productionOrigin}/dashboard/printing`,
which works as the tracker. With no portal client the link is left out.
`readyAt` is formatted in the hackathon's time zone. In local development `sendEmail` throws by
design, so delivery reports `"failed"`.

## Configurability review

Would this require a developer change next year?

- Answer: No. The channel, print time, and printer count are set per hackathon
  in Blade. Access is a role
  permission that officers assign. File limits and statuses are product rules,
  not organizational state.
- The KH IX tab is part of the yearly site. Next year's portal adds its own page
  using the same SDK hooks.

## React and frontend constraints

- Closed availability is a prominent, token-styled notice immediately below the
  KH IX printing header and before sponsor content. Use the existing query's
  `queue.isOpen` value; loading/errors remain distinct from confirmed closure.
  Update empty-state copy to match closure. This is presentation only, with no
  API, permission, upload, schema, or polling changes.

- The Blade page is a server component. It gates access, reads the list,
  counts, configuration, and hackathons, and passes them as props. No
  `"use client"` on the page.
- Mutations use `api.printing.*.useMutation` with toasts and
  `startTransition(() => router.refresh())`. Buttons are disabled while
  `isPending || isRefreshing`. A row-level pending ID applies only if row
  actions are added.
- The status filter lives in URL search params.
- On KH IX, the page renders `StatusStage` while locked, uses SDK hooks gated on
  `checkedin`, and holds idempotency keys through `useIdempotencyLease`.
  Uploads report per-file progress. Loading, empty, and error states follow the
  attendance list.

## Testing and verification strategy

- `pnpm --filter @forge/api test`: `estimateReadyTimes` with a fixed `now`
  (positions, printer rounding, printing start time, override, defaults),
  override clearing on status change, guard, status rules, staged-file claim,
  notification recipients and payloads with a fake gateway, participant status
  gating, audit coverage, and api-surface snapshot.
- `pnpm --filter @forge/validators test`: upload policy and input schemas.
- `pnpm --filter @forge/hacker-sdk test`: contract and adapter prefix and limits.
- `pnpm --filter @forge/blade test`: admin access predicate, role editor groups,
  and nav order.
- `pnpm db:generate` and `pnpm db:migrate` against local Postgres.
- `pnpm verify:precommit` and `pnpm build`.
- Browser verification with `playwright-skill` on Blade (:3000) and KH IX
  (:3007), with desktop and 320px screenshots.

## Open questions

See `status.md`.

## Shinies presentation refinement (2026-10-04)

Changes stay in KH IX and Blade printing components, their local styles/static assets, and the KH IX shell's printing-only canvas class. No new dependencies, schema, API, auth or upload implementation changes.

Visual thesis: a quiet workshop in the KH IX violet palette, anchored by Shinies' real white wordmark, with gold reserved for primary action and print estimates. Blade retains its semantic dark surfaces and violet action tokens.
Content hierarchy: sponsor identity and factual introduction; printing workspace/action; queue timing; active requests/history. Interaction: clear hover/focus feedback, existing Radix dialog transitions, preserved draft on dismissal and immediate close after successful submission. Motion respects reduced-motion preferences.

The unmodified logo is copied from apps/2025/public/sponsorSectionSvgs/shinies.svg into each consuming app's public/sponsors directory. Each app deploys independently; no shared package is needed for static assets. Sponsor description source: https://www.shinies.co/ (checked 2026-10-04).

## Organizer request counts (2026-10-04)

Extend the existing attendee aggregate in `printing.list` to return `requestCount` alongside `cancelCount`, grouped by attendee and scoped to the selected hackathon before display filtering. Reuse the existing query rather than add per-row reads. Blade consumes the additive field in queue rows and the detail header; no schema, permission, upload or notification changes. Keep the count in existing muted metadata, with the scope explained in job details.

## Upload security implementation — 2026-10-04

- Printing-specific content policy accepts complete ASCII STL facet grammar or exact-length binary STL records with finite coordinates/normals. PNG/JPEG references retain signature checks; no image/CAD renderer, archive extractor, or executable is invoked. This is structural validation, not certification of downstream viewer safety.
- Filename sanitization truncates the basename and appends the canonical allowed extension. Downloads require matching supported name/type and a server-written `stl-images-v1` object metadata marker; links remain ten-minute attachments served as `application/octet-stream`. Previously issued links can remain valid until their existing expiry.
- The SDK calls an authenticated, checked-in HEAD preflight before reading multipart data, handles session refresh there, and rejects failed preflights without consuming bytes. Printing body reads and upstream printing requests have 30-second deadlines. Blade repeats authorization before parsing POST data.
- A transaction-scoped per-attendee/hackathon PostgreSQL advisory lock serializes staging eviction, aggregate retained quotas, object upload and metadata insertion. Overlap fails promptly. The form queues selected uploads, including overlapping selections. Pruned objects are removed only after commit; attempted new objects are removed on rollback. Cleanup is best effort, so failed storage deletion can leave orphan objects.
- No schema, dependency, credential, environment-variable or production-storage configuration changes. Quotas bound retained tracked files, not total authenticated request concurrency. Deployment-level ingress limits, bucket ACLs, orphan reconciliation/retention scheduling and downstream slicer sandboxing remain operational concerns outside this patch.
