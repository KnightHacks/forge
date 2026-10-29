# LeetCode Daily Reliability Status

Current phase: Implemented, validated, and committed on
`cron/leetcode-graphql-daily`; issue #630 opened. Not pushed; no PR yet.

## Decisions

- 2026-10-29: Root cause confirmed from the production log: alfa-leetcode-api
  returned 429 at the 2026-10-28 noon run, and the job has no retry.
- Fetch from LeetCode's GraphQL endpoint directly, plus a fetch-only retry
  (user chose this over retry-only and over keeping alfa as a fallback).
- Branch `cron/leetcode-graphql-daily`; scope is `apps/cron` only.
- No Worker VM access: skip the pre-merge curl, verify on the first noon run
  after deploy, and revert on a 403/HTML response.
- CodeRabbit's #630 plan matched the design. Took its `User-Agent` header; kept
  3 attempts (30s, 2min) and the global-fetch/fake-timer tests over injected
  `fetch`/`sleep`.
- Missed 2026-10-28 post is not reposted by this change.

## Progress

- [x] Diagnose from production logs and git history (Forge, KnightHacks/tk).
- [x] Switch to GraphQL with retry in `apps/cron/src/crons/leetcode.ts`.
- [x] Add `apps/cron/src/tests/leetcode.test.ts`.
- [x] Issue: https://github.com/KnightHacks/forge/issues/630
- [ ] PR, review, and merge.
- [ ] First noon run after deploy logs `finished` with no error (Cloudflare check).

## Validation

- `pnpm --filter=@forge/cron test` 59/59, `pnpm lint` 31/31, `pnpm typecheck`
  33/33. Prettier passes on changed files; repo-wide `pnpm format` fails locally
  only on CRLF checkout (`core.autocrlf=true`).
- Old (`main`, alfa) and new (GraphQL) code run live with Discord stubbed: all
  22 output fields identical apart from the random daily message.
- Real end-to-end run posted to the dev server testing channel (webhook,
  bot-created thread, reminder); user confirmed it looks right.
