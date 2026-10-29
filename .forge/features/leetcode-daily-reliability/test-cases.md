# LeetCode Daily Reliability Test Cases

Tests live in `apps/cron/src/tests/leetcode.test.ts`
(`pnpm --filter=@forge/cron test`). They follow `reminder-wiring.test.ts`:
env, `discord.js`, `@forge/utils/discord`, and `CronBuilder` are mocked, global
`fetch` is stubbed, and fake timers skip the retry waits.

- **TC-001 Daily post:** one POST to `https://leetcode.com/graphql` produces the
  embed with an absolute problem link, `MM/DD/YYYY` author date, and spoilered
  topics. A thread is created and the spoiler reminder is sent into it.
- **TC-002 Rate limit:** a 429 followed by a 200 posts exactly once.
- **TC-003 Network error:** a rejected fetch followed by a 200 posts.
- **TC-NEG-001 Persistent failure:** three 503s stop after 3 attempts, nothing
  is posted, and the error reaches `CronBuilder` for logging.
- **TC-NEG-002 Query error:** HTTP 400 with GraphQL `errors` is not retried and
  nothing is posted.
- **TC-NEG-003 Missing daily:** HTTP 200 with a null daily question is not
  retried, and the error includes the GraphQL message.

Manual: run the cron executor once against live LeetCode with Discord stubbed,
and curl the endpoint from the production Worker VM.
