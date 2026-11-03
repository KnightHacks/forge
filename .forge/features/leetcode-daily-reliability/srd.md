# LeetCode Daily Reliability SRD

## Evidence and boundary

The production cron log for the 2026-10-28 noon run shows
`Error: Leetcode API -> 429` from `fetchData` in
`apps/cron/src/crons/leetcode.ts`. That job fetched
`alfa-leetcode-api.onrender.com/daily`, a shared public instance of
`alfaarghya/alfa-leetcode-api`. Its `src/app.ts` applies `express-rate-limit`
(120 requests/hour/IP) to every route, and every controller proxies
`https://leetcode.com/graphql`. The endpoint was introduced in KnightHacks/tk
`e88fa47` (2024-07-21) without a documented rationale and carried through the
monorepo migration and the move into `apps/cron`. `CronBuilder._executor` logs
and swallows errors without retrying, so one failed fetch skipped the day.

## Technical requirements

- Query LeetCode's GraphQL endpoint directly with
  `activeDailyCodingChallengeQuestion`. It is public and needs no key.
- Send `Content-Type`, `Referer`, and an identifying `User-Agent`
  (`KnightHacksForgeCron/1.0`) to reduce the chance of Cloudflare bot checks.
- Map the nested response to the shape the embed already uses. The `link` is
  relative, so prefix `https://leetcode.com`.
- Retry only the fetch: 3 attempts, waiting 30s and then 2min. Each attempt
  times out after 15s. Retry network errors, timeouts, 429, and 5xx. Fail fast
  on other 4xx, a non-JSON body (e.g. a Cloudflare page served with 200), any
  GraphQL `errors` (partial results null out fields), or a missing daily
  question. Webhook sends and thread creation are never retried, so a run
  cannot double-post.
- Keep the retry local to `leetcode.ts`. It has a single consumer, and the
  existing retries in `@forge/api` are DB-backed and job-specific.
- No env, dependency, schema, tRPC, permission, or tk changes.

## Configurability review

Would this require a developer change next year? No. The schedule, role ID, and
messages were already hard-coded and are unchanged.

## Risks

- LeetCode's GraphQL is undocumented and could change. A changed query returns
  HTTP 400 with a readable message, which is logged and not retried.
- Cloudflare in front of leetcode.com may challenge data-center IPs. Requests
  from a local machine succeed with and without the headers. Nobody on the
  branch has Worker VM access, so the first production noon run is the check;
  a 403 or HTML response there means revert.

## Rollout and rollback

Merging redeploys the cron container through Coolify. Verify at the next noon
run that the log shows `started` then `finished` with no error. To roll back,
revert the commit. The old API needs no configuration.
