# Career Job Alerts and Digests SRD

Status: Accepted for #650

## Responsibilities and access

`@forge/api` owns the preference store, matcher, and digest subscription and
repair services. Put the logic under `packages/api/src/utils/job-board/`, in
line with [the new job board router](https://github.com/KnightHacks/forge/pull/670)
and [ingestion work](https://github.com/KnightHacks/forge/pull/672). Follow Forge's
[package and access principles](../../../docs/agentic-development/forge-engineering-principles.md).

The future member procedures in #651 resolve the member ID from the signed-in
session and require a member profile. Each preference lookup or mutation is scoped
to that member. Digest repair and recipient resolution are server-side functions
for cron. Officers continue configuring role IDs through the existing Discord
settings.

## Preferences and matching

- Reuse the create, update, and ID validators in `packages/validators/src/job-board.ts`.
  Store preferences in `JobAlertPreference` with the existing unique key
  `(memberId, track, kind, targetKey)`. Treat a duplicate create or update as a
  `CONFLICT`. An update or remove for a missing or foreign preference returns
  `NOT_FOUND`.
- Match selected companies by `Job.companyKey`. Normalize custom company names
  using the same logic used for company keys. Validate selected Census city keys
  against the city lookup. For remote targets use the merged `remote_us` kind.
- Keep custom display text in `customValue`. A custom location uses normalized
  whole-word or phrase matching against `JobLocation.sourceText`. Check all
  location rows, including unknown locations for this custom-text match. Reject
  custom values that normalize to empty text.
- A pure matcher returns unique member IDs for a job and its locations. The
  database lookup resolves those members through `Member.userId` to
  `User.discordUserId`, validates IDs with the existing snowflake validator, and
  returns a stable, deduplicated list. Job delivery eligibility and duplicate
  message prevention belong to #654.

## Digest preferences and role repair

- Read and write `Member.jobInternshipDigestEnabled` and
  `Member.jobNewGradDigestEnabled`. Reuse `digestOptInInputSchema` for the
  `{ track, enabled }` input shape. Updating one track only writes its flag.
  Existing schema, defaults, and config rows cover this work.
- Save the flag before attempting the Discord change. Use the configured role
  for the track, the user's validated numeric Discord ID, and the existing Discord
  grant/revoke helpers. If config, identity, or the Discord operation prevents
  the role update, report `roleSynced: false` independently of the saved choice.
  A failed database write triggers no role call. The service resolves the role
  from the current subscriptions for the Discord account, so an opt-out on one
  member record preserves the role while another linked record opts in.
- For repair, compare opted-in Discord user IDs with the current members of the
  dedicated digest role. Reuse the existing guild-member paging logic where
  practical and require a complete read before making changes. Grant missing
  roles, revoke extras, and report grant, revoke, and per-member failure counts.
  A later run can retry failed updates. Both role write paths guard against
  shared digest roles and roles linked to Blade permissions.
- Test with an injected Discord gateway. The cron handoff specifies the role
  repair and recipient lookup contracts. Concurrent preference changes can
  leave Discord membership briefly stale after repair. #654 owns the decision
  about who can be mentioned at delivery time, using saved consent. Activating
  either Discord write path requires officer confirmation of the dedicated roles.

## Verification and handoff

Use pure matcher tests, a disposable PostgreSQL instance for storage/query
tests, and a fake Discord gateway for role side effects. Verify package imports
used by cron and run the affected package checks, then Forge's pre-commit checks.

The server entry point is `@forge/api/job-alerts.server`. It exposes the
recipient lookup and digest role repair for #654. The distinct subpath
can merge independently of #649's ingestion entry point in PR #672.
The member services stay within `@forge/api` for the #651 `jobBoard` router.
