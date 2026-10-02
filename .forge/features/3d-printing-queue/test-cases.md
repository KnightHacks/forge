# 3D Printing Queue Test Cases

Status: Draft, awaiting human approval

> This file owns observable proof. Do not generate implementation tests until the human approves these cases.

## Scope

Access at every boundary, the job lifecycle, file validation, staged-file
ownership, notification behavior and isolation from failures, and the Blade and
KH IX surfaces. Excluded: real Discord and Listmonk delivery in automated tests
(fake gateways stand in), printer hardware, and file retention.

## Test placement plan

| Area                                                                                | Package                      | Command                                |
| ----------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------- |
| Guards, status rules, claims, notifications, participant gating, audit, API surface | `@forge/api` (Vitest)        | `pnpm --filter @forge/api test`        |
| Upload policy, input schemas, audit catalog                                         | `@forge/validators` (Vitest) | `pnpm --filter @forge/validators test` |
| Contract, client limits, adapter routing                                            | `@forge/hacker-sdk` (Vitest) | `pnpm --filter @forge/hacker-sdk test` |
| Admin predicate, role editor, nav                                                   | `@forge/blade` (Vitest)      | `pnpm --filter @forge/blade test`      |
| End-to-end flows and screenshots                                                    | Blade :3000 and KH IX :3007  | `playwright-skill`                     |

## Test cases

### TC-001: Tab unlocks at check-in

Setup:

- One hacker with status `confirmed` and one with `checkedin` for the portal's
  hackathon.

Action:

- Each loads the dashboard.

Expected observations:

- The rail shows a locked `3D Printing` item for the confirmed hacker and a link
  to `/dashboard/printing` for the checked-in one, decided from
  `application.status` like Events (no `use_3d_printing` dashboard action; see
  `status.md`).
- Opening `/dashboard/printing` as the confirmed hacker shows the locked stage.

### TC-002: Checked-in hacker submits a job

Setup:

- A checked-in hacker. The channel is configured.

Action:

- Upload one `.stl` and one `.png`, then submit with a description.

Expected observations:

- Both uploads return file IDs.
- The job appears in `listPrintJobs` as `received` with both file names.
- Both file rows point to the job.
- The fake Discord gateway receives one channel message that names the hacker,
  includes the submission time, and mentions only roles holding
  `PRINTING_QUEUE`.

### TC-003: Submit is idempotent

Setup:

- A checked-in hacker with staged files.

Action:

- Call `submitPrintJob` twice with the same idempotency key and payload.

Expected observations:

- One job exists, and both calls return the same job.
- Only one channel message is sent.

### TC-004: Hacker sees only their own jobs

Setup:

- Hackers A and B each have a job at the same hackathon. A also has a job at a
  different hackathon.

Action:

- A calls `listPrintJobs`.

Expected observations:

- Only A's job at the session's hackathon is returned.

### TC-005: Hacker cancels an eligible job

Setup:

- One of the hacker's jobs is `received` and another is `needs_clarification`.

Action:

- Cancel each.

Expected observations:

- Both become `cancelled`.
- No DM or email is sent, because the hacker made the change.

### TC-006: Organizer works the queue

Setup:

- A user whose only role grants `PRINTING_QUEUE`. Three jobs submitted at
  t1 < t2 < t3, with statuses received, printing, and received.

Action:

- Call `printing.list` without a filter, then with `status: "received"`.

Expected observations:

- The unfiltered list is ordered t1, t2, t3.
- The filtered list is t1, t3.
- Counts are received 2, printing 1, and the rest 0.
- Each job includes the submitter's name, email, phone, Discord username, and
  cancel count.

### TC-007: Status update notifies the hacker

Setup:

- A `received` job. The fake Discord and email gateways succeed.

Action:

- Update the status to `needs_clarification` with the note "Which color?".

Expected observations:

- The job has the new status and note, and `statusChangedByUserId` is the
  organizer.
- One audit event `printing.job.status_updated` is recorded.
- One DM goes to the hacker's `discordUserId` and one email to the hacker's
  profile email, both containing the status and note.
- The response reports `{ discord: "delivered", email: "delivered" }`.
- The hacker's `listPrintJobs` shows the note.

### TC-008: Cancel count

Setup:

- A hacker with two cancelled jobs (one by the hacker, one by an organizer) and
  one picked-up job at this hackathon, plus one cancelled job at another
  hackathon.

Action:

- Call `printing.list`.

Expected observations:

- The hacker's cancel count is 2.

### TC-009: Organizer downloads a file

Setup:

- A job with a `.3mf` file.

Action:

- Call `printing.getFileDownloadUrl`.

Expected observations:

- It returns a presigned URL with `attachment` disposition and the original file
  name.
- A download audit event is recorded.

### TC-010: Channel configuration

Setup:

- An organizer with `PRINTING_QUEUE`.

Action:

- List the channels, save one, then disconnect.

Expected observations:

- Only guild text and announcement channels are listed.
- Saving stores the ID. Disconnecting stores null.
- Each change records `printing.channel.updated`.
- Submitting a job after disconnecting sends no channel message.

### TC-011: Staged file cleanup

Setup:

- One unclaimed file staged 25 hours ago, one unclaimed file staged 1 hour ago,
  and one claimed file staged 25 hours ago.

Action:

- Call `cleanupAbandonedPrintFiles` directly. No cron schedule exists yet.

Expected observations:

- Only the 25-hour-old unclaimed file's row and object are removed.

### TC-012: Ready-time estimates

Setup:

- Fixed `now`. Default settings (no configuration row: 60 minutes, 1 printer).
- Jobs in submission order: A `printing` (started 20 minutes ago), B
  `received`, C `needs_clarification`, D `received`, E `ready_for_pickup`.

Action:

- Call `estimateReadyTimes`, then `listPrintJobs` as the owner of D, then
  repeat with `printerCount` 2.

Expected observations:

- A: position 1, ready at start + 60 minutes (40 minutes from `now`).
- B: position 2, ready at `now` + 120 minutes. D: position 3, `now` + 180
  minutes, and the hacker sees 2 jobs ahead.
- C and E have no position or estimate.
- With 2 printers, B is `now` + 60 minutes and D is `now` + 120 minutes.
- `listPrintJobs.queue` reports 3 waiting and an estimated wait of 240 minutes
  with 1 printer.

### TC-013: Organizer ready-time override

Setup:

- Job D from TC-012 and an organizer with `PRINTING_QUEUE`.

Action:

- Set D's exact ready time to 30 minutes from now, reload as the hacker, clear
  it, then set it again and move D to `ready_for_pickup`.

Expected observations:

- After setting, the hacker sees the organizer's time, and B's estimate does
  not change.
- No DM or email is sent for either change. Each records
  `printing.job.estimate_updated`.
- After clearing, the computed estimate is back.
- After `ready_for_pickup`, `estimatedReadyAt` is null in the database.

### TC-014: Estimate settings and disclaimer

Setup:

- An organizer and a checked-in hacker.

Action:

- Save print time 45 and 2 printers, then open the KH IX printing page.

Expected observations:

- Configuration stores both values and records
  `printing.estimate_settings.updated`.
- The disclaimer names about 45 minutes per print and shows the waiting count
  and estimated wait using 2 printers.
- A status change to `printing` sends a DM and an email that include the
  estimated ready time and a link to the printing page.

## Negative and regression cases

### TC-NEG-001: Not checked in

Setup:

- A hacker with status `confirmed`.

Action:

- Call the upload route, `submitPrintJob`, `listPrintJobs`, and `cancelPrintJob`.

Expected observations:

- Each is refused with `FORBIDDEN_STATUS`. No row or object is created.

### TC-NEG-002: Blade access denied

Setup:

- A logged-in member with no `PRINTING_QUEUE` and no officer role.

Action:

- Call each `printing.*` procedure and open `/admin/printing`.

Expected observations:

- Every procedure throws `FORBIDDEN`.
- The page redirects to the member dashboard.
- The nav has no Printing Queue item.

### TC-NEG-003: Officer access

Setup:

- A user whose only special role is an `IS_OFFICER` role.

Action:

- Open the page and call `printing.list`.

Expected observations:

- Both succeed.
- That role is not mentioned in new-job notices unless it also grants
  `PRINTING_QUEUE`.

### TC-NEG-004: File rejected

Setup:

- A checked-in hacker.

Action:

- Upload a 50 MB + 1 byte file, a `.exe`, a `.png` whose bytes are not PNG, and
  a `.3mf` that is not a ZIP.

Expected observations:

- Each is rejected with a validation error naming the reason. No row or object
  remains.

### TC-NEG-005: File count limits

Setup:

- A checked-in hacker with six staged files.

Action:

- Submit with zero files, then with six.

Expected observations:

- Both are refused with validation errors, and no job is created.

### TC-NEG-006: Someone else's staged file

Setup:

- Hacker B has a staged file.

Action:

- Hacker A submits a job listing B's file ID.

Expected observations:

- The request is refused with `PRINT_FILE_UNAVAILABLE`, no job is created, and
  B's file stays unclaimed.

### TC-NEG-007: Re-claiming a file

Setup:

- A file already attached to a job.

Action:

- The same hacker submits a new job with that file ID.

Expected observations:

- Refused with `PRINT_FILE_UNAVAILABLE`.

### TC-NEG-008: Cancel not allowed

Setup:

- A hacker's jobs in `printing`, `ready_for_pickup`, `picked_up`, and
  `cancelled`, plus another hacker's `received` job.

Action:

- Cancel each.

Expected observations:

- Refused with `PRINT_JOB_NOT_CANCELLABLE` for the hacker's own jobs, and as not
  found for the other hacker's job. Nothing changes.

### TC-NEG-009: Notification failure isolation

Setup:

- The fake Discord gateway throws a 403 on DM creation, and the email gateway
  throws.

Action:

- The organizer updates a status.

Expected observations:

- The status change and audit event persist.
- The response reports `{ discord: "failed", email: "failed" }`.
- Blade shows a toast saying the status was saved but the notices failed.

### TC-NEG-010: Channel failure isolation

Setup:

- The channel is configured, and the gateway throws on post.

Action:

- A hacker submits.

Expected observations:

- The job is created and the hacker sees success.

### TC-NEG-011: Mention injection

Setup:

- A hacker whose name is `@everyone <@&123456789012345678>`.

Action:

- Submit a job.

Expected observations:

- The channel message sends `allowed_mentions.parse` as empty and lists only the
  `PRINTING_QUEUE` role IDs.
- The name is neutralized, so no extra mention resolves.

### TC-NEG-012: No-op status update

Setup:

- A `printing` job with no note.

Action:

- Update it to `printing` with no note.

Expected observations:

- No DM or email is sent, and the response reports `skipped` for both.

### TC-NEG-013: Invalid channel

Setup:

- An organizer.

Action:

- Save a channel ID that is not in the guild, or is not a snowflake.

Expected observations:

- Refused with a validation error. The stored value is unchanged.

### TC-NEG-014: Clarification without a note

Setup:

- A `received` job.

Action:

- Update it to `needs_clarification` with no note, then with a note that is
  only spaces.

Expected observations:

- Both are refused with a validation error on the note. The job stays
  `received`, and no DM or email is sent.
- Updating to `printing` with no note succeeds.

### TC-NEG-015: Invalid estimate input

Setup:

- An organizer and a `cancelled` job.

Action:

- Save print time 0, print time 601, or printer count 0. Set an override in the
  past, more than 7 days out, or on the `cancelled` job.

Expected observations:

- Each is refused with a validation error. Stored values are unchanged, and the
  database checks reject the same bounds if the API is bypassed.

### TC-REG-001: Existing permissions and adapter routes

Setup:

- Roles saved before this change, with 28-character bitstrings.

Action:

- Load permissions, and call the resume upload and download through the adapter.

Expected observations:

- Existing permissions are unchanged, and `PRINTING_QUEUE` reads as false.
- Resume routes behave as before, including their 5.2 MB limit.

## Open questions

See `status.md`.
