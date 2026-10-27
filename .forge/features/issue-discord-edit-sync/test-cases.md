# Issue Discord Edit Sync Test Cases

Status: Approved by human (2026-10-27)

## Scope

Starter embed rendering for edits and the edit sync decision/delivery logic. Router wiring and live Discord are covered by manual verification.

## Test placement plan

- `packages/api/src/tests/issues/creation-thread.test.ts`
- `pnpm --filter=@forge/api test`

## Test cases

### TC-EDIT-001: Changed embed is edited in place

Setup:

- Before and after targets differ in status; thread ID `777…`; fake gateway resolves parent channel `333…`.

Action:

- Run the edit sync.

Expected observations:

- One channel lookup for the thread ID, one edit to channel `333…`, message `777…`.
- The sent embed shows the new status; `allowedMentions.parse` is empty.

### TC-EDIT-002: Unchanged embed makes no Discord request

Setup:

- Before and after targets render the same embed (for example, only links differ).

Action:

- Run the edit sync.

Expected observations:

- Result is `unchanged`; the gateway is never called.

### TC-EDIT-003: Long description links to Blade

Setup:

- After target description is longer than 3,800 characters.

Action:

- Run the edit sync.

Expected observations:

- The edited embed description is at most 4,096 characters and ends with a "Full description in Blade" link to the issue URL.

### TC-IMG-001: Managed images become links to the issue

Setup:

- Description contains `![hamster](/_managed/issue-images/<uuid>)` and an image with empty alt text.

Action:

- Build the Discord payload.

Expected observations:

- No `/_managed/` text reaches Discord.
- Images render as `[🖼 Image: hamster](<issue url>)` and `[🖼 Image](<issue url>)`.
- Markdown characters in alt text are escaped so they cannot format the link.

### TC-EDIT-004: Newly added assignees are pinged in the thread

Setup:

- After target adds one Discord user to the existing assignees.

Action:

- Run the edit sync.

Expected observations:

- One thread message `cc: <@new>` with `allowedMentions.users` containing only the new user.

### TC-EDIT-005: Swapped assignee is pinged even when the embed is unchanged

Setup:

- One assignee replaced by another, so the Assigned count is the same.

Action:

- Run the edit sync.

Expected observations:

- No embed edit; one `cc:` thread message for the swapped-in user only.

### TC-EDIT-006: Removing assignees pings nobody

Setup:

- After target removes an assignee and adds none.

Action:

- Run the edit sync.

Expected observations:

- No thread message is sent.

## Negative / regression cases

### TC-EDIT-NEG-001: Creation embed is unchanged

Setup:

- Existing creation tests.

Action:

- Build the creation payload.

Expected observations:

- Existing creation assertions still pass; the creation starter has no "Full description in Blade" link even when its description overflows.

### TC-EDIT-007: Ping still sent when the embed edit fails

Setup:

- The thread lookup rejects (for example, the starter message was deleted); the edit adds an assignee and changes status.

Action:

- Run the edit sync.

Expected observations:

- The `cc:` thread message is still sent; the sync then reports the embed failure.

### TC-EDIT-008: Live edit-sync requests are time-bounded

Setup:

- Live edit gateway created with an abort signal; Discord REST client mocked.

Action:

- Call the thread lookup, embed edit, and thread message.

Expected observations:

- Every Discord request receives the abort signal.

## Open questions

- None.
