# `@forge/hacker-sdk`

Build a themed hacker portal without rebuilding the Forge participant backend.

The Hacker SDK provides typed React hooks, a browser client, and a Next.js
adapter. It does not provide components, styles, layouts, or theme assets.

Blade owns these concerns:

- identity and portal authorization;
- reusable hacker profiles and per-hack applications;
- agreements, status transitions, and confirmation capacity;
- resumes, check-in passes, attendance, points, and leaderboards;
- Hackathon Events schedule data; and
- validation, audit, and data retention.

The yearly hackathon site owns all participant-facing presentation and
interaction design.

## Supported environment

Use the SDK in a React and Next.js app inside the Forge monorepo.

Production portals must use a registered `*.knighthacks.org` HTTPS origin.
Development portals can use HTTP on any localhost or loopback port.

The SDK is not a generic public API client. Do not use it outside Forge or
expose Blade credentials from a yearly site.

## Quick start

### 1. Add the package

Add the SDK to the yearly app:

```bash
pnpm --filter @forge/khix add @forge/hacker-sdk@workspace:*
```

### 2. Provision the portal

Open the hackathon configuration page in Blade. Provision one Hacker portal
client for the selected hackathon.

Register the exact production origin. Copy the public client ID into the
yearly app:

```dotenv
BLADE_URL=https://blade.knighthacks.org
HACKER_PORTAL_CLIENT_ID=forge_public_id_from_blade
```

There is no client secret. The client ID selects the provisioned hackathon.
Blade authorizes the participant with its existing session and Proof Key for
Code Exchange (PKCE).

Never accept a hackathon ID from the browser.

### 3. Mount the same-origin adapter

Create `app/api/hacker-sdk/[...hackerSdk]/route.ts`:

```ts
import { createHackerSdkNextHandler } from "@forge/hacker-sdk/next";

const bladeOrigin = process.env.BLADE_URL;
const clientId = process.env.HACKER_PORTAL_CLIENT_ID;

if (!bladeOrigin || !clientId) {
  throw new Error("BLADE_URL and HACKER_PORTAL_CLIENT_ID are required.");
}

const handler = createHackerSdkNextHandler({ bladeOrigin, clientId });

interface RouteContext {
  params: Promise<{ hackerSdk: string[] }>;
}

export function GET(request: Request, context: RouteContext) {
  return handler(request, context);
}

export function POST(request: Request, context: RouteContext) {
  return handler(request, context);
}

export function DELETE(request: Request, context: RouteContext) {
  return handler(request, context);
}
```

The adapter performs these tasks:

- completes the Blade authorization-code flow with PKCE and state;
- stores access and rotating refresh tokens in host-only HttpOnly cookies
  namespaced by portal client and request origin;
- binds requests to the provisioned portal client;
- rejects cross-origin mutations and unsafe return paths;
- coalesces concurrent refreshes and retries an expired request;
- limits request bodies and streams resume uploads; and
- marks private participant responses as non-cacheable.

Do not copy this auth flow into the yearly site.

### 4. Add the React provider

Wrap the portal route group with `HackerSdkProvider`:

```tsx
"use client";

import type { ReactNode } from "react";

import { HackerSdkProvider } from "@forge/hacker-sdk/react";

export function HackerPortalProviders({ children }: { children: ReactNode }) {
  return <HackerSdkProvider portalKey="kh-x">{children}</HackerSdkProvider>;
}
```

`portalKey` only namespaces TanStack Query caches. It is not an authorization
value or a hackathon ID.

Use the direct browser client when React hooks do not fit the integration:

```ts
import { createHackerParticipantClient } from "@forge/hacker-sdk";

const client = createHackerParticipantClient({ portalKey: "kh-x" });
const hackathon = await client.getPublicHackathon();
const session = await client.getSession();
```

The direct client validates request and response data with the same exported
contract schemas. Prefer the React hooks for components and query caching.

### 5. Add a sign-in boundary

Use the SDK sign-in path. Do not redirect directly to Blade auth routes.

```tsx
"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { useHackerSdkClient, useHackerSession } from "@forge/hacker-sdk/react";

export function HackerSessionBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const session = useHackerSession();
  const { client } = useHackerSdkClient();

  if (session.isPending) return <p>Loading your hacker session…</p>;
  if (session.isError) return <p>Hacker sign-in is unavailable.</p>;

  if (!session.data?.authenticated) {
    return <a href={client.signInPath(pathname)}>Sign in with Discord</a>;
  }

  return children;
}
```

The adapter validates `returnTo`. It only accepts a path on the yearly site.

## Build the application flow

### Load reusable profile data

`useHackerApplication` returns the current application context:

```tsx
"use client";

import { useHackerApplication } from "@forge/hacker-sdk/react";

export function ApplicationIntro() {
  const context = useHackerApplication();

  if (context.isPending) return <p>Loading application…</p>;
  if (context.isError) return <p>Application data is unavailable.</p>;

  const firstName = context.data.profile?.firstName;
  const hasApplication = context.data.application !== null;

  return (
    <section>
      <h1>{firstName ? `Welcome back, ${firstName}` : "Apply"}</h1>
      {hasApplication ? <p>Your application is already on file.</p> : null}
    </section>
  );
}
```

Use `context.data.profile` to prefill shared profile fields. Do not prefill
these per-hack fields from a previous hackathon:

- `firstTime`;
- `survey1` and `survey2`; or
- agreement choices.

First-time status belongs to the current hackathon application. Ask the hacker
again for every hackathon.

### Render the current agreements

Blade versions agreement definitions. Render the exact definitions returned
for the current stage.

```tsx
"use client";

import { useState } from "react";

import { useHackerApplication } from "@forge/hacker-sdk/react";

export function ApplicationAgreements() {
  const context = useHackerApplication();
  const [choices, setChoices] = useState<Record<string, boolean>>({});
  const definitions =
    context.data?.agreements.filter(
      (definition) => definition.stage === "application",
    ) ?? [];

  return definitions.map((definition) => (
    <section key={definition.id}>
      <label>
        <input
          checked={choices[definition.id] ?? false}
          onChange={(event) =>
            setChoices((current) => ({
              ...current,
              [definition.id]: event.target.checked,
            }))
          }
          type="checkbox"
        />
        {definition.title}
        {definition.required ? " (required)" : " (optional)"}
      </label>
      {definition.content ? <p>{definition.content}</p> : null}
      {definition.contentUrl ? (
        <a href={definition.contentUrl}>Read the agreement</a>
      ) : null}
    </section>
  ));
}
```

Do not infer acceptance for an agreement that the hacker did not see.

### Keep an idempotency key for retries

Every mutation requires an `idempotencyKey`. Keep one key for one user action
and payload.

```tsx
import { useRef } from "react";

export function useIdempotencyLease(prefix: string) {
  const lease = useRef<{ fingerprint: string; key: string } | null>(null);

  return {
    acquire(payload: unknown) {
      const fingerprint = JSON.stringify(payload);
      if (lease.current?.fingerprint !== fingerprint) {
        lease.current = {
          fingerprint,
          key: `${prefix}:${crypto.randomUUID()}`,
        };
      }
      return lease.current.key;
    },
    release() {
      lease.current = null;
    },
  };
}
```

Release the key after success. The payload fingerprint automatically rotates
the key when the user edits a failed submission. Reusing one key with different
input returns a conflict.

### Submit an application

Use the exported input type. The SDK validates the complete input before it
sends a request.

```tsx
"use client";

import { useState } from "react";

import type {
  HackerAgreementAcceptanceInput,
  SubmitApplicationInput,
} from "@forge/hacker-sdk";
import {
  useHackerApplication,
  useSubmitHackerApplication,
} from "@forge/hacker-sdk/react";

type ApplicationAnswers = Omit<
  SubmitApplicationInput,
  "agreements" | "idempotencyKey"
>;

export function useApplicationSubmission() {
  const context = useHackerApplication();
  const submit = useSubmitHackerApplication();
  const submitKey = useIdempotencyLease("submit-application");
  const [choices, setChoices] = useState<Record<string, boolean>>({});

  async function onSubmit(answers: ApplicationAnswers) {
    const definitions =
      context.data?.agreements.filter(
        (definition) => definition.stage === "application",
      ) ?? [];
    const agreements: HackerAgreementAcceptanceInput[] = definitions.map(
      (definition) => ({
        accepted: choices[definition.id] ?? false,
        definitionId: definition.id,
      }),
    );

    const payload = {
      ...answers,
      agreements,
    };
    const result = await submit.mutateAsync({
      ...payload,
      idempotencyKey: submitKey.acquire(payload),
    });
    submitKey.release();

    return result.application;
  }

  return { choices, context, onSubmit, setChoices, submit };
}
```

`answers.profile` contains contact, demographic, education, shirt, allergy,
portfolio, and date-of-birth fields. Use the exported schema as the form
authority:

```ts
import { HACKER_PARTICIPANT_V1_SCHEMAS } from "@forge/hacker-sdk/contracts";

const submitApplicationSchema =
  HACKER_PARTICIPANT_V1_SCHEMAS.input.submitApplication;
const profileSchema = submitApplicationSchema.shape.profile;
```

Do not submit Discord identity. Blade derives Discord identity from the signed-
in user.

Custom per-hack questions are not part of the current contract. Do not add
private questions to the shared profile schema.

## Build profile editing

Use the composite participant mutation when one form edits shared profile
fields and hackathon-scoped application fields. Blade commits the whole save in
one transaction.

```tsx
"use client";

import type { SubmitApplicationInput } from "@forge/hacker-sdk";
import {
  useHackerApplication,
  useUpdateHackerParticipant,
} from "@forge/hacker-sdk/react";

export function useProfileEditor() {
  const context = useHackerApplication();
  const updateParticipant = useUpdateHackerParticipant();
  const participantKey = useIdempotencyLease("participant");

  async function saveProfile(
    profile: SubmitApplicationInput["profile"],
    firstTime: boolean,
    survey1: string,
    survey2: string,
  ) {
    const revision = context.data?.profile?.revision;
    if (!revision) throw new Error("The hacker profile is unavailable.");

    const payload = {
      expectedRevision: revision,
      firstTime,
      profile,
      survey1,
      survey2,
    };
    await updateParticipant.mutateAsync({
      ...payload,
      idempotencyKey: participantKey.acquire(payload),
    });
    participantKey.release();
  }

  return { context, saveProfile, updateParticipant };
}
```

Blade permits edits for active applications until the hackathon starts. The
server creates an immutable revision and updates eligible future applications.
Denied, withdrawn, and started applications retain their pinned snapshots.

Handle `STALE_PROFILE_REVISION` by refetching the application context. Ask the
hacker to reapply changes to the latest revision.

## Build lifecycle actions

Blade is authoritative for time, status, capacity, and permissions. Render
actions from `allowedActions`.

```tsx
"use client";

import type { HackerDashboardDto } from "@forge/hacker-sdk";
import { useHackerDashboard } from "@forge/hacker-sdk/react";

type HackerAction = HackerDashboardDto["allowedActions"][number]["action"];

export function useAllowedHackerAction(actionName: HackerAction) {
  const dashboard = useHackerDashboard();
  const action = dashboard.data?.allowedActions.find(
    (candidate) => candidate.action === actionName,
  );

  return {
    allowed: action?.allowed === true,
    reason: action?.reason ?? null,
  };
}
```

The server rechecks every action. Handle a rejection even when the last read
returned `allowed: true`.

### Confirm attendance

Render the current `confirmation` agreements before confirmation:

```tsx
"use client";

import {
  useConfirmHackerAttendance,
  usePublicHackathon,
} from "@forge/hacker-sdk/react";

export function useHackerConfirmation() {
  const publicHackathon = usePublicHackathon();
  const confirm = useConfirmHackerAttendance();
  const confirmationKey = useIdempotencyLease("confirmation");

  const definitions =
    publicHackathon.data?.agreements.filter(
      (definition) => definition.stage === "confirmation",
    ) ?? [];

  async function confirmAttendance(choices: Record<string, boolean>) {
    await confirm.mutateAsync({
      agreements: definitions.map((definition) => ({
        accepted: choices[definition.id] ?? false,
        definitionId: definition.id,
      })),
      idempotencyKey: confirmationKey.acquire(agreements),
    });
    confirmationKey.release();
  }

  return { confirm, confirmAttendance, definitions };
}
```

Confirmation can fail when the deadline passes or capacity becomes full.
Handle `CONFIRMATION_CLOSED` and `CAPACITY_REACHED` as normal lifecycle
results.

### Withdraw an application

Withdrawal is irreversible participant self-service. Show a confirmation
dialog before the mutation.

```tsx
"use client";

import { WITHDRAWAL_ACKNOWLEDGEMENT } from "@forge/hacker-sdk";
import { useWithdrawHackerApplication } from "@forge/hacker-sdk/react";

export function useHackerWithdrawal() {
  const withdraw = useWithdrawHackerApplication();
  const withdrawKey = useIdempotencyLease("withdraw");

  async function withdrawApplication() {
    const confirmed = window.confirm(
      "Withdraw your application? You cannot reverse this action.",
    );
    if (!confirmed) return;

    await withdraw.mutateAsync({
      acknowledgement: WITHDRAWAL_ACKNOWLEDGEMENT,
      idempotencyKey: withdrawKey.acquire(WITHDRAWAL_ACKNOWLEDGEMENT),
    });
    withdrawKey.release();
  }

  return { withdraw, withdrawApplication };
}
```

Use the yearly site’s dialog system in the final UI. Do not add a participant
undo action. Officers retain separate correction authority in Blade.

## Issue the check-in QR

Check-in pass issuance is an explicit mutation. A new pass rotates the
previous pass.

```tsx
"use client";

import type { ComponentType } from "react";

import { useIssueHackerCheckInPass } from "@forge/hacker-sdk/react";

export function CheckInPass({
  QrRenderer,
}: {
  QrRenderer: ComponentType<{ value: string }>;
}) {
  const issuePass = useIssueHackerCheckInPass();

  return (
    <section>
      <button
        disabled={issuePass.isPending}
        onClick={() =>
          issuePass.mutate({
            idempotencyKey: `check-in-pass:${crypto.randomUUID()}`,
          })
        }
        type="button"
      >
        Open check-in QR
      </button>

      {issuePass.data ? <QrRenderer value={issuePass.data.payload} /> : null}
    </section>
  );
}
```

Do not issue a pass during render, refocus, or an automatic query. Do not log,
persist, or include the opaque payload in analytics.

Confirmed and checked-in hackers can request a pass. Only a successful primary
hackathon check-in changes the application status to `checkedin`.

## Show participant event data

The SDK gates checked-in queries with the dashboard status:

```tsx
"use client";

import {
  useHackerAttendance,
  useHackerDashboard,
  useHackerPoints,
  useHackerSchedule,
} from "@forge/hacker-sdk/react";

export function HackerSchedule() {
  const dashboard = useHackerDashboard();
  const schedule = useHackerSchedule();
  const attendance = useHackerAttendance();
  const points = useHackerPoints();

  if (dashboard.isPending) return <p>Loading hacker status…</p>;
  if (dashboard.data?.application?.status !== "checkedin") {
    return <p>The schedule unlocks after hackathon check-in.</p>;
  }
  if (schedule.isPending) return <p>Loading the event schedule…</p>;

  return (
    <section>
      <p>Total points: {points.data?.total ?? 0}</p>
      <p>Recorded check-ins: {attendance.data?.occurrences.length ?? 0}</p>
      {schedule.data?.events.map((event) => (
        <article key={event.id}>
          <h2>{event.name}</h2>
          <p>{event.location}</p>
          <time dateTime={event.startAt}>{event.startAt}</time>
          <p>{event.points} points</p>
        </article>
      ))}
    </section>
  );
}
```

Schedule events come from Blade Hackathon Events. Public Discord or Google
Calendar publication does not change participant schedule visibility.

| Hook                                                | Server visibility          |
| --------------------------------------------------- | -------------------------- |
| `useHackerSchedule`                                 | `checkedin` only           |
| `useHackerAttendance`                               | `checkedin` only           |
| `useHackerPoints`                                   | `checkedin` only           |
| `useHackerLeaderboard({ scope: "overall" })`        | `confirmed` or `checkedin` |
| `useHackerLeaderboard({ scope: "class", classId })` | `confirmed` or `checkedin` |

Leaderboard rows contain a privacy-safe display name. They never expose a full
participant directory.

```tsx
"use client";

import { useHackerLeaderboard } from "@forge/hacker-sdk/react";

export function OverallLeaderboard() {
  const leaderboard = useHackerLeaderboard({ scope: "overall" });

  return leaderboard.data?.rows.map((row) => (
    <p key={`${row.rank}:${row.displayName}`}>
      {row.rank}. {row.displayName} — {row.points} points
      {row.isCurrentUser ? " (you)" : ""}
    </p>
  ));
}
```

## Manage resumes

Resume metadata and resume bytes use separate paths.

```tsx
"use client";

import {
  useHackerResume,
  useHackerSdkClient,
  useUploadHackerResume,
} from "@forge/hacker-sdk/react";

export function ResumeField() {
  const resume = useHackerResume();
  const upload = useUploadHackerResume();
  const { client } = useHackerSdkClient();
  const resumeKey = useIdempotencyLease("resume");

  async function onFile(file: File) {
    await upload.mutateAsync({
      file,
      fileName: file.name,
      idempotencyKey: resumeKey.acquire({
        lastModified: file.lastModified,
        name: file.name,
        size: file.size,
      }),
    });
    resumeKey.release();
  }

  return (
    <section>
      <input
        accept="application/pdf"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFile(file);
        }}
        type="file"
      />
      {resume.data ? (
        <a href={client.resumeDownloadPath}>Download current resume</a>
      ) : null}
    </section>
  );
}
```

The SDK accepts one PDF no larger than 5 MB. Blade repeats content and size
validation. Never store a Blade object name or signed storage URL in the site.

Create a new application before the optional resume upload. This sequence lets
the portal report a successful application with a recoverable resume failure.

## Handle SDK errors

SDK failures normalize to `HackerSdkError`:

```tsx
import { parseHackerSdkError } from "@forge/hacker-sdk";

try {
  await mutation();
} catch (cause) {
  const error = parseHackerSdkError(cause);

  if (error.code === "SESSION_EXPIRED") {
    window.location.assign(client.signInPath(window.location.pathname));
    return;
  }

  if (error.code === "STALE_PROFILE_REVISION") {
    await applicationQuery.refetch();
    return;
  }

  showError(error.message);
  reportRequestId(error.requestId);
}
```

Use these fields at UI boundaries:

| Field         | Use                                                    |
| ------------- | ------------------------------------------------------ |
| `code`        | Select a stable recovery path or lifecycle message.    |
| `message`     | Show the safe participant-facing message.              |
| `retryable`   | Offer a retry with the same input and idempotency key. |
| `requestId`   | Correlate participant reports with Blade logs.         |
| `fieldIssues` | Map server validation issues to form fields.           |

Do not display raw tRPC, storage, mail, Discord, database, or provider errors.

## React hook reference

### Read hooks

| Hook                   | Result                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `usePublicHackathon`   | Public dates, timezone, capacity, theme, and agreement definitions.                |
| `useHackerSession`     | Authentication state, display name, and session expiry.                            |
| `useHackerApplication` | Profile prefill, application, agreement choices, resume metadata, and editability. |
| `useHackerDashboard`   | Current participant state and server-authoritative actions.                        |
| `useHackerResume`      | Resume metadata or `null`.                                                         |
| `useHackerSchedule`    | Checked-in Hackathon Events schedule.                                              |
| `useHackerAttendance`  | Personal event check-in occurrences.                                               |
| `useHackerPoints`      | Personal point entries and total.                                                  |
| `useHackerLeaderboard` | Overall or configured-class ranking.                                               |

### Mutation hooks

| Hook                           | Action                                                         |
| ------------------------------ | -------------------------------------------------------------- |
| `useSubmitHackerApplication`   | Create the per-hack application and reusable profile revision. |
| `useUpdateHackerProfile`       | Update shared profile fields with revision control.            |
| `useUpdateHackerApplication`   | Update per-hack first-time status, surveys, or agreements.     |
| `useConfirmHackerAttendance`   | Accept confirmation agreements and claim capacity.             |
| `useWithdrawHackerApplication` | Irreversibly withdraw an eligible application.                 |
| `useIssueHackerCheckInPass`    | Rotate and return an opaque check-in pass.                     |
| `useUploadHackerResume`        | Upload one PDF resume.                                         |
| `useRemoveHackerResume`        | Remove the current resume.                                     |
| `useHackerSignOut`             | Revoke the portal session and reset participant queries.       |

## Lifecycle reference

Use `allowedActions` as the UI authority. The table is a design reference, not
an authorization replacement.

| Status         | Edit before start             | Confirm                      | Withdraw before start | QR  | Schedule |
| -------------- | ----------------------------- | ---------------------------- | --------------------- | --- | -------- |
| No application | During the application window | No                           | No                    | No  | No       |
| `pending`      | Yes                           | No                           | Yes                   | No  | No       |
| `waitlisted`   | Yes                           | No                           | Yes                   | No  | No       |
| `accepted`     | Yes                           | Before deadline and capacity | Yes                   | No  | No       |
| `confirmed`    | Yes                           | Complete                     | Yes                   | Yes | No       |
| `checkedin`    | Yes, before start             | Complete                     | No                    | Yes | Yes      |
| `denied`       | No                            | No                           | No                    | No  | No       |
| `withdrawn`    | No                            | No                           | No                    | No  | No       |

`getHackerLifecycleState` and `getHackerCapabilityHints` provide presentation
hints for themed portals. Blade still performs every authorization check with
database time.

## Security and data boundaries

Keep these rules in every yearly portal:

- Use the same-origin adapter for all participant requests.
- Keep the portal client ID on the server route.
- Never let browser input choose the hackathon scope.
- Never request club membership or dues through the hacker flow.
- Never store portal access tokens, refresh tokens, or check-in pass payloads.
- Never expose provider IDs, storage keys, audit metadata, or operator data.
- Never reveal another hacker’s attendance history or full surname.
- Derive age from DOB at the relevant timestamp. Do not store mutable age
  history in the yearly site.
- Keep schedule data hidden until the server returns `checkedin` access.

## Agent implementation checklist

Before an agent changes a yearly portal:

1. Read this README and `src/contracts.ts`.
2. Inspect KH IX for the current working integration.
3. Use exported hooks and schemas. Do not copy Blade router logic.
4. Render the agreement definitions returned by Blade.
5. Keep first-time status in the per-hack application.
6. Gate buttons with `allowedActions`, then handle server rejection.
7. Keep mutation idempotency keys stable across retries.
8. Issue check-in passes only after an explicit participant action.
9. Test signed-out, applicant, accepted, confirmed, and checked-in states.
10. Test desktop and mobile layouts without importing KH IX presentation code.

Run the package gates after contract or SDK changes:

```bash
pnpm --filter @forge/hacker-sdk typecheck
pnpm --filter @forge/hacker-sdk test
pnpm verify:precommit
```

## Canonical source locations

- SDK contract and procedure map: [`src/contracts.ts`](./src/contracts.ts)
- React hooks: [`src/react.tsx`](./src/react.tsx)
- Next.js auth adapter: [`src/next.ts`](./src/next.ts)
- Shared validation:
  [`packages/validators/src/hacker-portal.ts`](../validators/src/hacker-portal.ts)
- Participant API:
  [`packages/api/src/hacker-portal/`](../api/src/hacker-portal/)
- Working themed consumer: [`apps/khix/`](../../apps/khix/)
- Product and architecture decisions:
  [`.forge/features/hacker-sdk/`](../../.forge/features/hacker-sdk/)
