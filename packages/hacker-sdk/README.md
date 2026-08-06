# `@forge/hacker-sdk`

The Hacker SDK is the headless participant layer for Forge hackathon websites.
Blade owns identity, retained profiles, application state, resumes, agreements,
check-in, event data, points, and audit. Each yearly website owns every visual
and interaction decision, so Knight Hacks themes stay expressive without
forking the backend again.

The supported target is a React/Next app in the Forge monorepo, hosted on a
Knight Hacks subdomain or any localhost port during development. This package
is intentionally opinionated for that environment; it is not a generic public
API client or a component library.

## Provision a portal

In Blade, open the hackathon configuration page and provision one Hacker portal
client. Copy its public client ID and configure the yearly app:

```dotenv
BLADE_URL=https://blade.knighthacks.org
HACKER_PORTAL_CLIENT_ID=forge_public_id_from_blade
```

The registered production origin must be an exact HTTPS
`*.knighthacks.org` origin. Blade permits HTTP localhost and loopback origins,
on any port, only in development. There is no client secret: the public client
ID identifies the hackathon while PKCE and the user's Blade session authorize
the handoff.

## Mount the same-origin adapter

Create `app/api/hacker-sdk/[...hackerSdk]/route.ts`:

```ts
import { createHackerSdkNextHandler } from "@forge/hacker-sdk/next";

const bladeOrigin = process.env.BLADE_URL;
const clientId = process.env.HACKER_PORTAL_CLIENT_ID;

if (!bladeOrigin || !clientId) {
  throw new Error("BLADE_URL and HACKER_PORTAL_CLIENT_ID are required.");
}

const handler = createHackerSdkNextHandler({ bladeOrigin, clientId });

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
```

The adapter:

- completes a Blade-brokered authorization-code flow with PKCE and state;
- keeps access and rotating refresh tokens in host-only HttpOnly cookies;
- binds every request to the provisioned client, never a browser-selected hack;
- rejects cross-origin mutations and unsafe return paths;
- coalesces concurrent refreshes and retries one expired request;
- streams resume bodies through the same-origin boundary; and
- returns private, non-cacheable participant responses.

## Add the React provider

`portalKey` only namespaces TanStack Query caches. It is not trusted as the
hackathon ID.

```tsx
import { HackerSdkProvider } from "@forge/hacker-sdk/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <HackerSdkProvider portalKey="kh-x">{children}</HackerSdkProvider>;
}
```

## React hooks

Read hooks:

- `usePublicHackathon` — public dates, timezone, capacity, theme, and current
  agreement definitions.
- `useHackerSession` — safe sign-in state and display name.
- `useHackerApplication` — reusable profile prefill, per-hack application,
  recorded agreement choices, resume metadata, and editability.
- `useHackerDashboard` — current lifecycle state and server-authoritative
  allowed actions.
- `useHackerResume` — metadata only; use `client.resumeDownloadPath` for the
  authenticated file response.
- `useHackerSchedule`, `useHackerAttendance`, and `useHackerPoints` — enabled
  only after whole-hack check-in.
- `useHackerLeaderboard` — overall or arbitrary configured-class ranking for
  confirmed and checked-in hackers.

Mutation hooks:

- `useSubmitHackerApplication`
- `useUpdateHackerProfile`
- `useUpdateHackerApplication`
- `useConfirmHackerAttendance`
- `useWithdrawHackerApplication`
- `useIssueHackerCheckInPass`
- `useUploadHackerResume` and `useRemoveHackerResume`
- `useHackerSignOut`

The check-in pass hook is deliberately an explicit mutation. Issuing a new
opaque pass rotates the previous one, so it must never happen because a tab
refocused or a query automatically retried.

## Application and profile rules

The base profile contract contains contact, demographic, education, shirt,
allergy, portfolio, and DOB fields. Discord identity comes from Blade auth and
is rejected if a yearly site attempts to submit it. A retained profile can
prefill a later hackathon, but `firstTime`, the two application responses, and
agreement choices are per-hack facts. First-time status is always asked again;
it is never copied from a past application.

Profile and application edits are allowed for active statuses until that
hackathon starts. Blade creates immutable revisions and updates other future
applications while preserving revisions already pinned by past hackathons.
Age and minor status are derived from DOB at the relevant timestamp rather than
stored as mutable history.

Custom per-hack question authoring is intentionally deferred. Do not encode
new private questions into the base profile contract.

## Lifecycle and agreements

Blade is authoritative for application windows, confirmation deadlines,
capacity, and status transitions. Render actions from `allowedActions` and
still handle a server rejection—the clock, capacity, or status can change after
the page loads.

Agreement definitions are versioned in Blade. Submit the exact current
`definitionId` with each accepted boolean. Required agreements are validated on
the server, and the application context returns recorded choices for faithful
form replenishment.

Withdrawal is irreversible participant self-service. The site must show a
confirmation dialog and submit the exported
`WITHDRAWAL_ACKNOWLEDGEMENT` literal. Only officers can correct state later.

## Idempotency and errors

Every mutation takes an `idempotencyKey`. Create one when the user starts an
action and reuse it for retries of that same payload; a new click/action gets a
new key. Reusing a key with a different payload is a conflict.

```ts
const key = `confirm:${crypto.randomUUID()}`;
await confirm.mutateAsync({ agreements, idempotencyKey: key });
```

SDK failures are `HackerSdkError` values with a stable `code`, safe `message`,
`retryable` flag, optional `requestId`, and optional field issues. Use
`parseHackerSdkError(error)` at UI boundaries. Do not display raw tRPC, storage,
mail, Discord, or database errors.

## Visibility guarantees

The participant contract never exposes provider IDs, storage object names,
operator-only check-in data, private audit metadata, full leaderboard surnames,
or another hacker's history. Schedule data remains server-hidden until the
participant is `checkedin`, regardless of whether officers publish those events
to public Discord or Google calendars.
