# Issue Discord Edit Sync Status

Current phase: Artifact review with human, then pre-PR checks

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-10-27: Sync the starter embed after `issues.update`; no thread change notes, no thread archiving.
- 2026-10-27: Resolve the starter's channel from the thread's `parent_id` instead of `Roles.issueReminderChannel`, so team or channel changes do not break edits. No schema change.
- 2026-10-27: Skip Discord when the rendered embed is unchanged (compare before/after output of the shared renderer).
- 2026-10-27: Sync is best-effort; failures are logged and never fail the committed edit.
- 2026-10-27: Descriptions over 3,800 characters get a "Full description in Blade" link on edit; follow-up messages are not updated. Called out as a PR limitation.
- 2026-10-27: Managed issue images (`/_managed/issue-images/...`) render in Discord as a "🖼 Image: <alt>" link to the Blade issue for both creation and edit embeds. Previously the raw markdown was posted. Showing real images in the thread (upload to Discord) is a follow-up: privacy decision and likely schema change.
- 2026-10-27: Edits that add assignees post a `cc:` thread message pinging only the added people (human request after manual testing). Existing/removed assignees are not pinged; the team role is never pinged on edit.
- 2026-10-27: forge-review (standard: access, api-shape, test-quality). Access: no findings. Fixed: edit-sync requests time out after 5 seconds; embed edit and assignee ping run independently; tests now distinguish the parent channel, check the swap message exactly, cover alt-text escaping and the creation overflow link. Accepted as limitations (human decision): concurrent-save ordering, thread name not renamed. Not tested automatically: router try/catch (covered by manual check).
- 2026-10-27: Blade hydration warning (`<div>` inside `<p>` from `ManagedIssueImage` skeleton) is out of scope for this `packages/api` PR.

## Open questions

- None.

## Task list

- [x] Human reviewed and approved `spec.md`, `srd.md`, and `test-cases.md` (2026-10-27) (written from conversation decisions after implementation started; not reverse-prompted with the writer skills).
- [x] `forge-api` and `forge-placement` skills checked against the diff (read after implementation).
- [x] Tests TC-EDIT-001 to 003 written and confirmed failing first. TC-IMG-001 and TC-EDIT-004 to 006 were not run before implementation.
- [x] Shared starter embed renderer and `syncIssueThread` with live gateway.
- [x] `issues.update` calls the sync after reload.
- [x] TC-IMG-001 managed image links in Discord descriptions.
- [x] TC-EDIT-004 to 006 new-assignee pings.
- [x] Manual check: adding an assignee pings only them (verified by the human).
- [x] Manual check: create and edit sync verified in test channel by the human.
- [ ] Manual check: image link rendering in test channel.
- [x] `pnpm verify:push` and `forge-review` (format step fails locally only from CRLF checkout; see Validation).
- [ ] Open PR.

## Validation / commands

- `pnpm --filter=@forge/api exec vitest run src/tests/issues/`: 8 files, 35 tests passed.
- `pnpm typecheck`: passed (33 tasks).
- `pnpm lint`: passed, 0 errors (existing max-lines warnings on `issues.ts`).
- `pnpm format`: fails repo-wide locally because `core.autocrlf=true` checks files out with CRLF; changed files pass `prettier --check`.

## Links

- PRs:
- Issues: #628
- Discord/thread context: manual check used a personal test server and channel (IDs kept out of the repo).
