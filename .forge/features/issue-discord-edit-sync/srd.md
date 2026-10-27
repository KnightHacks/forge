# Issue Discord Edit Sync SRD

Status: Approved by human (2026-10-27)

## Technical purpose

After `issues.update`, keep the issue's Discord starter embed in sync with the issue row and ping newly added assignees in its thread. Render managed issue images as links in all Discord issue descriptions (creation and edit).

## Relevant principles

From `docs/agentic-development/forge-engineering-principles.md`:

- **tRPC and API principles:** no new procedure or REST route; the workflow stays in `issues.update`, with testable logic in `utils/issues/`.
- **Auth, Discord, and permission principles:** Discord side effects go through the existing `@forge/api` issue thread utilities and the shared `@forge/utils/discord` client, not one-off calls. Access is unchanged (`permProcedure` plus `issueAccessForRoles` edit scope).
- **Configurability principles:** no channel or role IDs are hard-coded; the channel comes from Discord (`parent_id`) and team config stays in `Roles`.
- **Testing principles:** Vitest unit tests in `@forge/api`, written from `test-cases.md`.
- **Comments and human readability:** comments explain the Discord failure policy and why the thread's parent channel is used.

From `.claude/skills/forge-api`: Discord calls run after the transaction commits, never inside it, and failure behavior is stated in a comment.

## Access policy

- Unchanged. Sync runs only inside `issues.update`, after its existing edit-permission check.

## Architecture / data flow

1. `issues.update` loads the issue (`current`), validates, and commits the edit as today.
2. It reloads the issue (`updated`), as today.
3. If `updated.discordThreadId` is set, build the starter embed for `current` and `updated` with the same renderer used on creation.
4. If the two embeds are equal, skip the embed edit.
5. Otherwise, `GET /channels/{discordThreadId}` to read the thread's `parent_id` (the channel holding the starter message), then `PATCH /channels/{parent_id}/messages/{discordThreadId}` with the new embed and `allowed_mentions: { parse: [] }`.
6. If the edit added assignees, post `cc: <@id> …` into the thread with `allowed_mentions.users` limited to the added users. This runs even when the embed is unchanged (for example, swapping one assignee for another).
7. Steps 5 and 6 run independently (`Promise.allSettled`), so a failed embed edit (for example, a deleted starter message) does not drop the ping.
8. All edit-sync Discord requests share one 5-second `AbortSignal.timeout`, so a slow or rate-limited Discord cannot hold the save open.
9. Any error is logged with `logger.warn` and swallowed; the mutation returns normally.

`Roles.issueReminderChannel` is not used for edits because the team or its channel may have changed since creation.

## tRPC/API behavior

- No procedure, input, or output changes.
- `packages/api/src/utils/issues/creation-thread.ts` exports the starter embed renderer and the edit sync (gateway pattern, same as creation).
- `packages/api/src/routers/issues.ts` shares one record-to-target mapping between creation and edit.
- `packages/api/src/utils/issues/images.ts` exports `replaceIssueImageMarkdown`, reusing the existing managed-image regex.

## Validation

- No validator changes.

## Data / migration / compatibility

- No schema change. Uses existing `Issue.discordThreadId`.
- Follow-up message IDs are not stored, so follow-ups are not updated (documented limitation).
- Descriptions over 3,800 characters: the edited embed shows the first chunk plus a "Full description in Blade" link. The original "Description continued" messages are left as they were.
- Known limitation (accepted 2026-10-27): two saves of the same issue landing within the same moment can apply their Discord updates out of order, leaving the older state shown until the next edit, and can ping an added assignee twice. The DB revision check does not order Discord calls.
- Known limitation (accepted 2026-10-27): renaming an issue updates the embed title but not the thread name. Discord limits channel/thread renames to about two per ten minutes, which would cause the rate-limit waits the timeout guards against.

## Discord integration

- Same feature switch as creation: enabled in production or when `ISSUE_DISCORD_THREADS_ENABLED=true`.
- Same bot token (`DISCORD_BOT_TOKEN`). Editing requires the bot to be the author, which it is.
- At most three REST calls per edit (thread lookup, embed edit, assignee `cc:`); none when nothing visible changed and nobody was added.

## Configurability review

Would this require a developer change next year?

- Answer: No.

## React / frontend constraints

- None. No Blade UI changes.

## Testing / verification strategy

- Unit tests in `packages/api/src/tests/issues/creation-thread.test.ts` with a fake gateway.
- `pnpm --filter=@forge/api test`, then `pnpm format`, `pnpm lint`, `pnpm typecheck`.
- Manual: local Blade with `ISSUE_DISCORD_THREADS_ENABLED=true` and a team's local `issue_reminder_channel` pointed at a test channel.

## Open questions

- None.
