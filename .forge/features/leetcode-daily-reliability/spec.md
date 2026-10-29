# LeetCode Daily Reliability Spec

Status: Implemented on `cron/leetcode-graphql-daily` (2026-10-29).

## Purpose and scope

Members with the LeetCode role expect the daily problem in the daily challenges
channel at noon. On 2026-10-28 nothing was posted because the third-party API we
fetched from answered with HTTP 429. The post should keep arriving every day, in
the same format, even when the upstream source briefly fails.

## Acceptance criteria

- The noon post, role ping, embed (title, link, difficulty, likes, dislikes,
  spoilered topics), thread, and spoiler reminder look the same as before.
- A transient upstream failure (rate limit, server error, network error) delays
  the post by at most about 2.5 minutes and does not skip the day.
- A failed run never posts twice.
- A permanent failure (LeetCode changes the query) shows up as a clear error in
  the cron logs and posts nothing.

## Non-goals

No change to the schedule, channel, webhook, message copy, or tk. No fallback
to the old API, no reposting missed days, no admin-configurable schedule.
