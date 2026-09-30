# 3D Printing Queue SRD

Status: Draft, awaiting human approval

## Technical purpose

Add a hackathon-scoped print job queue. Checked-in hackers submit and track jobs
through the Hacker SDK. Blade organizers with `PRINTING_QUEUE` work the queue.
Forge stores jobs, staged files, and a per-hackathon Discord channel. Discord
and email notifications run after the database commit and report a separate
delivery result.

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
  `cancelPrintJob`, and the upload route refuse with `FORBIDDEN_STATUS`.
  `allowedActions` reports `use_3d_printing: false`.
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

| Layer               | Owns                                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `@forge/consts`     | `PRINTING_QUEUE` at permission index 28 (append only), `PRINT_JOB_STATUSES`, cancellable statuses, `MINIO.PRINT_FILES_BUCKET_NAME`              |
| `@forge/db`         | `PrintJob`, `PrintJobFile`, `PrintingConfiguration`, relations, migration 0055                                                                  |
| `@forge/validators` | Blade inputs in `printing.ts`, print-file upload policy in `upload-policy.ts`, participant schemas in `hacker-portal.ts`, audit catalog entries |
| `@forge/api`        | `routers/printing.ts`, `utils/printing/{access,status,files,notifications}.ts`, participant procedures in `hacker-portal/`                      |
| `@forge/email`      | `printJobStatusEmail` template                                                                                                                  |
| `@forge/hacker-sdk` | contract entries, `uploadPrintFile` client method, hooks, adapter prefix                                                                        |
| `apps/blade`        | nav, page, queue dashboard, upload route handler                                                                                                |
| `apps/2026`         | rail unlock, printing page, form, job list                                                                                                      |

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

## tRPC/API behavior

### Blade router `printing` (all `permProcedure`)

| Procedure             | Input                                | Output                                                                                         | Audit                                                    |
| --------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `list`                | `{ hackathonId, status? }`           | jobs oldest first, with submitter contact, file metadata, cancel count; plus per-status counts | excluded (read)                                          |
| `getFileDownloadUrl`  | `{ fileId }`                         | presigned GET URL valid for 10 minutes, `attachment` disposition                               | audited, matching the form-attachment download precedent |
| `updateStatus`        | `{ jobId, status, note? }`           | job and delivery result                                                                        | audited                                                  |
| `getConfiguration`    | `{ hackathonId }`                    | `{ channelId \| null }`                                                                        | excluded                                                 |
| `listDiscordChannels` | none                                 | guild text channels                                                                            | excluded                                                 |
| `setChannel`          | `{ hackathonId, channelId \| null }` | configuration                                                                                  | audited `printing.channel.updated`                       |

All of these go in `utils/audit/coverage.ts` under the router file name
`printing.*`. The new action keys go in `AUDIT_ACTION_CATALOG` under the
`hackathons` domain. The api-surface snapshot and namespace list get `printing`.

### Participant procedures (`hacker-portal/`)

| Procedure               | Tier                     | Notes                                                          |
| ----------------------- | ------------------------ | -------------------------------------------------------------- |
| `listPrintJobs`         | participant, `checkedin` | own jobs, newest first, with file names and the organizer note |
| `submitPrintJob`        | participant, `checkedin` | idempotent through the existing participant command pattern    |
| `cancelPrintJob`        | participant, `checkedin` | `{ jobId, idempotencyKey }`; refuses if not cancellable        |
| `removeStagedPrintFile` | participant, `checkedin` | only unclaimed files owned by the caller                       |

Participant mutations follow the existing `hacker-portal` command pattern for
idempotency and audit. `getDashboard.allowedActions` gains `use_3d_printing`,
backed by `canUsePrinting: status === "checkedin"` in
`utils/hacker-portal/policy.ts`.

Errors use the existing portal error codes where they fit (`FORBIDDEN_STATUS`,
validation issues) and add `PRINT_JOB_NOT_CANCELLABLE` and
`PRINT_FILE_UNAVAILABLE`. Messages shown to hackers never include storage,
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
- Objects are stored as `print-jobs/<hackathonId>/<hackerAttendeeId>/<fileId>-<safeName>`.
  Hackers never see object names.

## Data, migration, and compatibility

New tables, all additive:

- **`knight_hacks_print_job`:** `id`, `hackathonId` (cascade), `hackerAttendeeId`
  (cascade), `description`, `status` (text enum with a check constraint, default
  `received`), `statusNote` (nullable), `createdAt`, `statusChangedAt`,
  `statusChangedByUserId` (nullable, set null). Index on
  `(hackathonId, status, createdAt)` for the queue, and on
  `(hackerAttendeeId, createdAt)` for the hacker list.
- **`knight_hacks_print_job_file`:** `id`, `printJobId` (nullable, cascade),
  `hackathonId`, `hackerAttendeeId`, `objectName` (unique), `fileName`,
  `contentType`, `size`, `createdAt`. Index on `printJobId`, and a partial index
  on `createdAt` where `printJobId IS NULL` for cleanup.
- **`knight_hacks_printing_configuration`:** `hackathonId` (primary key,
  cascade), `discordChannelId varchar(20)` (nullable, snowflake check),
  `updatedAt`.

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
  name through `neutralizeMentions`, and uses a nonce for deduplication.
- **DM:** `POST /users/@me/channels` with `{ recipient_id }`, then post the
  message. The recipient is the `User.discordUserId` behind the hacker.
  `allowed_mentions: { parse: [] }`. A 403 (DMs closed) returns `"failed"`.
- A gateway interface, like `JudgingDiscordGateway`, lets tests replace the
  REST client.

## Email

`printJobStatusEmail({ name, status, note, portalUrl })` returns
`{ subject, html, text }`, escapes every input, and is sent with `sendEmail` to
the hacker's current profile email. In local development `sendEmail` throws by
design, so delivery reports `"failed"`.

## Configurability review

Would this require a developer change next year?

- Answer: No. The channel is set per hackathon in Blade. Access is a role
  permission that officers assign. File limits and statuses are product rules,
  not organizational state.
- The KH IX tab is part of the yearly site. Next year's portal adds its own page
  using the same SDK hooks.

## React and frontend constraints

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

- `pnpm --filter @forge/api test`: guard, status rules, staged-file claim,
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
