# Hacker SDK Test Cases

Status: Approved

## Scope

These cases cover the participant `v1` contract, Forge React SDK, auth adapter,
profile revision model, application lifecycle, resume and QR behavior,
Hackathon Events-backed participant reads, event publication controls,
reconciliation, reminders, migration, access, and the Blade controls.

Custom questions, past-hackathon participant history, team leaderboards, club
attendance behavior, and a KH IX theme redesign are excluded. KH IX SDK
integration and responsive behavior are included; ended hackathon sites are
checked only for static rendering and removal of dead participant entry points.

## Test placement plan

- `packages/hacker-sdk`: Vitest for contracts, errors, pure helpers, provider,
  hooks, and Next adapter behavior.
- `packages/validators`: Vitest for shared input/output schemas.
- `packages/auth`: Vitest/integration for portal authorization and sessions.
- `packages/api`: Vitest integration for participant and publication workflows.
- `packages/db`: migration validation/preflight tests or scripts.
- `apps/blade`: Vitest for view models where useful and Playwright for the
  publication-control workflow, responsive layout, and accessibility.
- Provider tests use fake Discord and Google gateways. Live credentials are not
  required for the automated suite.

Expected commands:

```bash
pnpm --filter=@forge/hacker-sdk test
pnpm --filter=@forge/validators test
pnpm --filter=@forge/auth test
pnpm --filter=@forge/api test
pnpm --filter=@forge/db test
pnpm --filter=@forge/blade test
pnpm --filter=@forge/blade e2e
pnpm verify:precommit
pnpm verify:push
pnpm build
```

## Contract and SDK cases

### TC-SDK-001: A Forge React site can create a participant client

Setup:

- A site configures the `v1` same-origin adapter and wraps interactive content
  in the SDK provider.

Action:

- Two differently styled test renderers read hackathon and application state.

Expected observations:

- Both receive the same typed state and actions.
- The SDK renders no required markup, copy, styles, assets, form steps, or
  dialog state.

### TC-SDK-002: Focused hooks share portal-scoped server state

Setup:

- An authenticated participant has an application and dashboard.

Action:

- Application, status, resume, and points hooks render together, then a profile
  mutation succeeds.

Expected observations:

- Related participant data refreshes once through stable portal-scoped keys.
- Unrelated provider/calendar queries are not invalidated.

### TC-SDK-003: SDK use outside its provider fails clearly

Setup:

- A component calls a Hacker SDK hook without the SDK provider.

Action:

- The component renders.

Expected observations:

- It throws a direct configuration error naming the missing provider rather
  than failing later with an undefined client.

### TC-SDK-004: Domain errors retain stable machine-readable context

Setup:

- Blade returns a participant error with code, request ID, retryability, and
  field issues.

Action:

- The SDK parses the error.

Expected observations:

- All stable fields remain available to the themed site.
- The site is not required to parse a mutable human message.

### TC-SDK-005: Participant DTOs reject internal data

Setup:

- A server response contains a blacklist reason, provider ID, storage object
  name, operator ID, or mail-health field.

Action:

- The SDK validates the response schema.

Expected observations:

- The unexpected internal data is rejected or stripped at the contract
  boundary and never reaches a participant hook.

### TC-SDK-006: Withdrawal requires the irreversible acknowledgement

Setup:

- A participant is eligible to withdraw.

Action:

- The site invokes withdrawal without the exported acknowledgement literal,
  then with it after its confirmation dialog.

Expected observations:

- The first input fails client and server validation.
- The acknowledged request reaches the lifecycle mutation.

## Authentication and portal-scope cases

### TC-AUTH-001: Registered production portal signs in and returns safely

Setup:

- An enabled portal client belongs to one hackathon and one exact HTTPS Knight
  Hacks origin.
- The user has no portal session.

Action:

- The site starts sign-in, the user completes Discord auth, and the adapter
  exchanges the returned code.

Expected observations:

- The browser returns to the original relative path on the registered origin.
- State and PKCE cookies are consumed.
- Opaque access/refresh values are stored only in host-only HttpOnly cookies.
- The browser receives no Better Auth token or platform credential.

### TC-AUTH-002: Any localhost port works only in development

Setup:

- Blade runs once in development and once in production.

Action:

- A registered client requests callbacks on `localhost` and loopback IP ports
  other than Blade's port.

Expected observations:

- Development accepts loopback origins on arbitrary ports.
- Production rejects loopback and non-HTTPS callbacks.

### TC-AUTH-003: Unregistered and cross-client callbacks are rejected

Setup:

- Two portal clients belong to different hackathons.

Action:

- A request substitutes another origin, callback path, client, or hackathon.

Expected observations:

- Blade rejects the request before issuing a code.
- No open redirect or cross-hack session is created.

### TC-AUTH-004: State, PKCE, expiry, and one-use rules prevent replay

Setup:

- Blade issued one short-lived authorization code.

Action:

- Exchanges use the wrong state, wrong verifier, an expired code, and the same
  valid code twice.

Expected observations:

- Each invalid exchange fails safely.
- Only the first valid exchange creates a portal session.

### TC-AUTH-005: Portal session scope cannot be selected by request input

Setup:

- A valid session belongs to portal A and hackathon A.

Action:

- A caller adds hackathon B's name, ID, or client ID to participant inputs and
  requests B's application.

Expected observations:

- The API derives hackathon A from the portal session and never returns or
  mutates B.

### TC-AUTH-006: Expired access refreshes once without a loop

Setup:

- The access token is expired and the refresh token is valid.

Action:

- A hook performs one private query.

Expected observations:

- The adapter refreshes server-to-server and retries the request once.
- The browser never sees the tokens and the request succeeds once.

### TC-AUTH-007: Invalid refresh clears the session

Setup:

- Both portal tokens are expired, revoked, or invalid.

Action:

- A private query receives `SESSION_EXPIRED` and the adapter's retry also
  fails.

Expected observations:

- The adapter clears both cookies and returns the stable error.
- The SDK exposes a sign-in action and does not redirect repeatedly.

### TC-AUTH-008: Central logout and revocation invalidate portal sessions

Setup:

- A portal session references a Better Auth session.

Action:

- The user signs out through the adapter or the central session is revoked.

Expected observations:

- Subsequent participant calls fail as unauthenticated.
- Site cookies are cleared on adapter sign-out.

### TC-AUTH-009: Mutation adapter rejects cross-origin requests

Setup:

- A participant has valid host-only cookies.

Action:

- A mutation arrives with a mismatched Origin or unsupported content type.

Expected observations:

- The adapter rejects it before forwarding participant credentials.

### TC-AUTH-010: Private responses cannot enter a shared cache

Setup:

- Two users request dashboards and schedules through the same deployment.

Action:

- Response headers and repeated reads are inspected.

Expected observations:

- Private responses are `private, no-store`.
- No response for one user is served to the other.

## Profile, application, and agreement cases

### TC-APP-001: New application creates one canonical profile and snapshot

Setup:

- An authenticated user has no Hacker profile, Member row, or application.
- Applications are open.

Action:

- The user submits valid base fields, fresh first-time status, survey answers,
  required agreements, and an idempotency key.

Expected observations:

- One canonical profile, one immutable revision, one compatibility Hacker
  snapshot, and one pending attendee are created atomically.
- No Member row or dues payment is required.
- The application records first-time and agreement evidence for this hack only.

### TC-APP-002: Returning hacker receives safe reusable prefill

Setup:

- The user has a canonical profile and a prior hackathon application.

Action:

- The next hackathon requests application context.

Expected observations:

- Reusable profile fields and resume metadata are prefilled.
- First-time status, survey answers, and agreement acceptance are blank for the
  new hackathon.

### TC-APP-003: Concurrent and retried submissions create one application

Setup:

- The user has no application for the selected hackathon.

Action:

- Two equal requests race with one idempotency key, then another request reuses
  the key with different data.

Expected observations:

- The equal requests return one recorded application result.
- Only one attendee exists for the user/hackathon.
- Different data with the same key returns an idempotency conflict.

### TC-APP-004: Application window is server-authoritative

Setup:

- One hackathon is before open, one is open, and one is after deadline.

Action:

- The same user attempts submission through each portal.

Expected observations:

- Only the open hackathon accepts submission.
- Forged client clocks or UI state do not change the result.

### TC-APP-005: Profile edit propagates only to future hacks

Setup:

- The user has applications for one started hackathon and two future
  hackathons, all referencing the current revision.

Action:

- The user edits a reusable profile field from a future portal using the
  expected revision.

Expected observations:

- One new immutable revision becomes current.
- Both future applications and compatibility snapshots use the new data.
- The started hackathon retains its prior sponsor-visible revision.

### TC-APP-006: Stale revision cannot overwrite newer profile data

Setup:

- Two devices loaded the same profile revision and one already saved a change.

Action:

- The other device submits its stale expected revision.

Expected observations:

- The stale write returns `STALE_PROFILE_REVISION` and does not create another
  revision or overwrite data.

### TC-APP-007: Start-boundary race locks edits

Setup:

- A profile request begins just before the hackathon start time but reaches its
  transaction after start.

Action:

- The mutation checks database time while holding the relevant locks.

Expected observations:

- The edit is rejected as locked and no future/sponsor snapshot changes commit
  for the started hackathon.

### TC-APP-008: Read-only statuses remain locked

Setup:

- Applications exist in denied, withdrawn, and checked-in states before the
  event end.

Action:

- Each participant attempts profile or application edits.

Expected observations:

- Each write is rejected with a stable status reason.

### TC-APP-009: Age is derived correctly

Setup:

- Profiles include ordinary and February 29 birthdays around exact birthday,
  hack-start, and check-in timestamps.

Action:

- Dashboard, organizer minor flag, and check-in warning derive age.

Expected observations:

- Results use DOB and the relevant timestamp/timezone without reading a stored
  age value.
- Minors are flagged but not automatically rejected from apply or confirm.

### TC-APP-010: Agreement versions and provenance remain per hack

Setup:

- Two hackathons use different active agreement versions and a migrated legacy
  application has unversioned booleans.

Action:

- The participant submits/confirm each new application and officers inspect the
  legacy record.

Expected observations:

- New acceptances store the exact active version and acceptance time.
- Application and confirmation terms are separate.
- Optional marketing refusal remains valid.
- Legacy evidence is labeled unknown/unversioned rather than assigned a false
  modern version.

## Lifecycle, resume, and QR cases

### TC-LIFE-001: Accepted hacker confirms before deadline and capacity

Setup:

- An accepted application is before the confirmation deadline, capacity is
  available, and current confirmation terms are accepted.

Action:

- The participant confirms with an idempotency key.

Expected observations:

- Status becomes confirmed once, `timeConfirmed` is recorded, agreement
  evidence and status-mail enqueue commit atomically, and retry returns the same
  result.

### TC-LIFE-002: Confirmation rejects invalid state, deadline, and terms

Setup:

- Applications cover non-accepted states, an expired deadline, and stale or
  missing confirmation terms.

Action:

- Each attempts confirmation.

Expected observations:

- Each fails with its stable reason and leaves status/mail unchanged.

### TC-LIFE-003: Concurrent final-capacity confirmation admits one

Setup:

- One confirmation slot remains and two accepted hackers race.

Action:

- Both confirm concurrently.

Expected observations:

- Exactly one becomes confirmed and the other receives capacity reached.
- Capacity is never exceeded.

### TC-LIFE-004: Eligible statuses can withdraw irreversibly

Setup:

- Pending, waitlisted, accepted, and confirmed applications exist before start.

Action:

- Each sends the acknowledged withdrawal command.

Expected observations:

- Each becomes withdrawn once, status notification is queued, and any QR pass
  is revoked.
- Repeating the same command returns the recorded result.

### TC-LIFE-005: Ineligible withdrawal cannot change state

Setup:

- Withdrawn, denied, checked-in, and post-start applications exist.

Action:

- Each attempts participant withdrawal.

Expected observations:

- Each is rejected with a stable reason.
- No participant-facing undo or reapplication path appears.

### TC-RESUME-001: Valid PDF upload and replacement are participant-scoped

Setup:

- An editable participant selects a valid PDF under 5,000,000 bytes.

Action:

- The same-origin adapter streams upload, then the participant replaces it.

Expected observations:

- Server signature/type/size and ownership validation succeeds.
- Hooks receive safe metadata and short-lived download access, never an object
  name.
- The canonical profile and future application revision update consistently.

### TC-RESUME-002: Invalid and cross-user resume operations fail safely

Setup:

- Inputs include a fake PDF, oversized PDF, another user's object, and a locked
  application.

Action:

- Upload, finalize, replace, download, or remove is attempted.

Expected observations:

- Each invalid operation fails without changing the profile or exposing storage
  internals.

### TC-RESUME-003: Historical resume references survive replacement

Setup:

- A started hackathon revision references resume A and the current profile later
  replaces it with resume B.

Action:

- Garbage/reference discovery runs and authorized sponsor/current-user reads
  occur.

Expected observations:

- Resume A remains retained for the pinned revision.
- Current profile reads use resume B.

### TC-QR-001: Confirmed hacker receives an opaque hack-scoped pass

Setup:

- A confirmed participant has no Member row.

Action:

- The participant requests a QR and a scanner resolves it for the same
  hackathon.

Expected observations:

- The payload contains no user UUID or personal data.
- The scanner resolves the correct attendee without membership.

### TC-QR-002: Wrong-hack, revoked, and ineligible passes fail

Setup:

- A valid pass is scanned under another hackathon; another holder withdrew;
  another application is only accepted.

Action:

- Each pass is resolved.

Expected observations:

- Each fails without revealing whether another hack/user exists.
- Temporary legacy user-UUID passes still resolve only inside the selected hack
  during cutover.

## Schedule, attendance, points, and leaderboard cases

### TC-DASH-001: Schedule remains server-hidden before whole-hack check-in

Setup:

- Pending, accepted, and confirmed participants exist, and public Discord/Google
  projections are live.

Action:

- Each calls the schedule procedure directly, bypassing hook enablement.

Expected observations:

- The server denies all three.
- Public provider visibility does not weaken the SDK rule.

### TC-DASH-002: Checked-in schedule comes from Forge events

Setup:

- A checked-in hacker belongs to a hack with ordinary and primary check-in
  events while both external providers are off.

Action:

- The hacker loads schedule/timeline.

Expected observations:

- Safe events return in chronological order from the database, including the
  primary check-in event.
- Provider IDs, errors, operator data, and admin fields are absent.

### TC-DASH-003: Personal attendance shows repeats without duplicate points

Setup:

- A checked-in participant has one initial event occurrence, one allowed repeat,
  and one voided occurrence.

Action:

- The participant loads attendance and points.

Expected observations:

- Active initial and repeat occurrences appear.
- The repeat awards zero and the voided occurrence contributes nothing.
- Operator and repair metadata stay private.

### TC-DASH-004: Club and unrelated totals never enter hacker points

Setup:

- The user has club Member points, attendee legacy/manual totals, and active
  Hackathon Event awards.

Action:

- The participant loads its points and leaderboard.

Expected observations:

- Only active initial Hackathon Event awards contribute.

### TC-DASH-005: Leaderboard access and privacy are correct

Setup:

- Pending, accepted, confirmed, and checked-in participants exist across
  configured classes, including a VIP.

Action:

- Each status requests overall and class leaderboards.

Expected observations:

- Only confirmed and checked-in viewers receive data.
- Ranked rows are checked-in participants and show first name plus last initial.
- The current user is marked without exposing a profile ID.
- The VIP remains in its assigned class.

### TC-DASH-006: Leaderboard ties use competition ranking

Setup:

- Point totals are 100, 100, and 75 in one scope.

Action:

- The leaderboard is computed.

Expected observations:

- Ranks are 1, 1, and 3 with deterministic secondary ordering.
- A confirmed viewer without check-in/class is returned as unranked.

## Publication and reconciliation cases

### TC-PUB-001: New hacks start database-only

Setup:

- An officer creates a hackathon and several valid events.

Action:

- Publication health is loaded before either switch is enabled.

Expected observations:

- Discord and Google both show healthy Off.
- Events remain usable in Forge and no provider create call occurs.

### TC-PUB-002: Providers enable independently for all events

Setup:

- A database-only hack contains zero, one, then many events including primary
  check-in.

Action:

- An editor enables Discord only, then Google.

Expected observations:

- Requested state commits immediately.
- Durable work covers every event for only the selected provider.
- Health progresses from Publishing to On as work converges.

### TC-PUB-003: Future CRUD honors desired provider state

Setup:

- Discord is on and Google is off.

Action:

- An editor creates, edits, duplicates, and deletes events.

Expected observations:

- Discord work keeps its projections current.
- Google receives no create/update call and remains intentionally disabled.
- Deletion still cleans any stale known Google projection before removing the
  Forge row.

### TC-PUB-004: Disable confirmation is stale-safe

Setup:

- A provider has a known number of remote projections.

Action:

- An editor opens disable confirmation, the remote/event count changes, then
  the editor submits the old expected revision/count.

Expected observations:

- The mutation returns conflict and refreshes health.
- No stale destructive request is applied.

### TC-PUB-005: Disabling removes projections but retains events

Setup:

- A provider is On with ordinary and primary check-in projections.

Action:

- An editor confirms disable.

Expected observations:

- Desired state changes to off and UI shows Removing.
- Each external projection is deleted or proven absent.
- Forge event rows, attendance, points, and SDK schedule remain intact.
- Final health is healthy Off.

### TC-PUB-006: Partial failures persist and retry after restart

Setup:

- A bulk enable includes successes, a rate limit, timeout, and definite provider
  error.

Action:

- The worker runs, the process restarts, automatic due work runs, and an editor
  requests immediate retry.

Expected observations:

- Successful events are not duplicated.
- Safe failures persist attempt/error/next-retry state and resume after restart.
- Backoff is capped and manual retry safely requeues eligible work.
- Health reports converged, pending, and error counts across refreshes.

### TC-PUB-007: Discord ambiguous create is blocked, not duplicated

Setup:

- Discord accepts a create but Forge loses the response and has no remote ID.

Action:

- Automatic and manual workers run, then an officer links a candidate or
  confirms absence.

Expected observations:

- Forge never issues another blind create while outcome is unknown.
- Hack health shows Blocked and exposes the existing repair action.
- Repair converges to one projection or safely requeues after confirmed absence.

### TC-PUB-008: Google recovers by private identity

Setup:

- Google accepts a create but Forge loses the response.

Action:

- Reconciliation searches by Forge event/creation identity.

Expected observations:

- Exactly one matching projection is adopted and no duplicate is created.
- Multiple matches remain actionable rather than choosing silently.

### TC-PUB-009: Latest event and toggle revisions win races

Setup:

- Publication enables while an event is edited, then the provider is disabled
  before an earlier call completes.

Action:

- Old and new workers complete in either order.

Expected observations:

- Lease, event revision, and publication revision fences prevent stale writes
  from becoming current.
- Final remote state matches the newest event and desired off state.

### TC-PUB-010: Provider outage never blocks Forge event operations

Setup:

- Discord and Google are degraded or disabled for a hack event.

Action:

- A confirmed hacker uses primary check-in, then loads schedule and attends an
  ordinary event.

Expected observations:

- Check-in, checked-in-only schedule, attendance, and points succeed from Forge
  data despite external health.

### TC-PUB-011: Payload limits apply while publication is off

Setup:

- Both providers are off.

Action:

- An editor creates/edits an event or changes the hackathon display name so the
  future Discord title/description would exceed provider limits.

Expected observations:

- Validation rejects the invalid saved state before later bulk publication.

### TC-PUB-012: Reminder announcements are calendar-independent

Setup:

- A non-primary hack event is due for reminder, Discord Scheduled Events are
  off, and announcement channel/hack role are configured.

Action:

- The hack reminder worker runs.

Expected observations:

- It posts from the database event and pings the configured hack role.
- The message omits a Scheduled Event URL.
- Primary check-in is excluded, normal Club reminder selection never reads the
  hack event, and ambiguous send handling remains at-most-once.

### TC-PUB-013: Access and audit cover publication actions

Setup:

- Users have read-only, edit, check-in-only, and no Hackathon Event capability.

Action:

- Each reads health, toggles, retries, and repairs an ambiguity.

Expected observations:

- Read-only can inspect health but cannot mutate.
- Edit can perform all publication actions.
- Check-in-only and no-access users cannot read/mutate beyond their existing
  check-in surface.
- Successful mutations audit actor, hackathon, provider, desired state, count,
  and outcome without PII.

## Blade UI and migration cases

### TC-UI-001: Publication controls match the Hack Events action bar

Setup:

- A selected hackathon has a long name and both providers in mixed health.

Action:

- The Hackathon Events page renders at 1440px and 320px.

Expected observations:

- Discord/Google controls sit in the existing action row near selector/create/
  feedback actions, not in a separate card.
- Labels, state text, and controls remain readable with no document overflow.
- Touch targets are at least 44px on mobile.

### TC-UI-002: Disable dialog and health details are accessible

Setup:

- Discord is on with many projections and some blocked work.

Action:

- A keyboard user opens disable confirmation, cancels, reopens and confirms,
  then opens health details and retries a safe failure.

Expected observations:

- Dialog names hackathon, provider, and removal count.
- Cancel changes nothing and restores focus.
- Confirm shows pending state, closes safely, toasts, and refreshes the action
  row.
- Health uses text plus color and blocked rows expose the right repair action.

### TC-UI-003: Large event sets stay usable

Setup:

- A selected hack has at least 60 events with long labels and partial provider
  failures.

Action:

- An officer filters events and inspects publication detail on desktop/mobile.

Expected observations:

- The existing paginated/filtered event workspace remains compact.
- Detail content is bounded and scrollable without trapping page scrolling.

### TC-MIG-001: Legacy profiles backfill without historical loss

Setup:

- Users have multiple legacy Hacker rows across past and future hackathons with
  different profile values/resumes.

Action:

- The migration preflight and backfill run.

Expected observations:

- One canonical profile exists per user.
- Each attendee points to the immutable revision matching its legacy Hacker row.
- The latest profile becomes current without rewriting older revisions.
- Existing compatibility Hacker rows remain intact.

### TC-MIG-002: Duplicate or orphan data stops cutover visibly

Setup:

- Data contains duplicate applications for one user/hack, an orphan attendee,
  or a missing user.

Action:

- Migration preflight runs.

Expected observations:

- It exits nonzero with actionable identifiers and makes no silent winner
  choice.

### TC-MIG-003: Existing publication intent and identities survive rollout

Setup:

- Existing hackathons have nonlegacy events with a mix of live, pending, error,
  and unknown Discord/Google projections.

Action:

- Publication configuration/work backfill runs.

Expected observations:

- Both providers remain desired on for hacks that previously used always-on
  synchronization.
- Existing remote IDs, applied revisions, ambiguity state, and errors are not
  erased.
- New/empty hackathons remain off.

### TC-MIG-004: Mixed-version rollout does not let old writers erase state

Setup:

- Current `main` and Reforge share the additive schema during the proving
  window.

Action:

- Legacy application and event reads/writes run before toggles are exposed.

Expected observations:

- Legacy required columns remain compatible.
- New revisions, portal/auth records, provider intent, and work survive.
- After a provider is disabled, rollback documentation blocks an unsafe old
  writer from resuming without deliberate reconciliation.

## Open questions

None. The owner approved autonomous test-oracle decisions on 2026-08-06.
