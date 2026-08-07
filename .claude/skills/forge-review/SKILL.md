---
name: forge-review
description: Reviews a working diff or branch in Forge with scope-derived agents, running the static gate first and refusing to spend agents on a red diff. Use this whenever someone asks to review, check, sanity-check, or look over changes; before committing meaningful work, opening a PR, or merging; and especially when a procedure was removed or renamed or agent-written work has not received human review.
---

# Forge Review

Run the local static gate before allocating judgment-heavy review. This skill
complements CI; treat a red local result with the same seriousness as red CI.

## Run the static gate first, and stop if it fails

```bash
pnpm verify:precommit
```

That is `analyze:react:changed`, `format`, `lint`, and `typecheck`. If it fails,
**report the failure and stop**. Do not spawn a single agent.

Two reasons. An agent spent re-deriving a type error is a waste of tokens and
attention. And a reviewer reading a diff that does not compile will chase
symptoms of the break instead of reviewing the change.

One caveat learned the hard way: `pnpm lint` caches, and it will replay a stale
failure after the underlying error is fixed. If lint is red and you believe it
is fixed, re-run with `npx turbo run lint --force --continue` before reporting.

## Let the diff decide who reviews

Never run a fixed panel. Read the diff first:

```bash
git diff --name-only    # or: git diff --name-only main...HEAD
git diff --stat
```

Map changed paths to reviewers, and spawn only those. A three-file change should
cost about three agents.

| Changed path                                                   | Reviewer     | What only a human-or-agent can see                                                      |
| -------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| `packages/api/src/routers/**`                                  | access       | Correct tier, guard called before work, permission actually enforced server-side        |
| `packages/api/src/**` (any)                                    | api-shape    | Procedure anatomy, DTO leakage, transactions around multi-table writes and side effects |
| `packages/db/src/schemas/**`, `packages/db/drizzle/**`         | migration    | Backfill correctness, rollback, prod-data caveats, index and FK gaps                    |
| `packages/validators/**`                                       | validation   | Client and server sharing one schema, divergent duplicate rules                         |
| `apps/blade/src/app/_components/**`                            | react        | The React doctrine below                                                                |
| `apps/blade/src/app/**/page.tsx`, `layout.tsx`                 | boundary     | Server-first, no page-level `"use client"`, auth gate placement                         |
| `packages/consts/**`, `packages/utils/**`, `apps/*/src/lib/**` | placement    | The placement rules below                                                               |
| `**/*.test.*`, `**/*.spec.*`                                   | test-quality | Does it assert behavior, or markup                                                      |
| any deletion or rename in `packages/api/src/routers/**`        | **consumer** | Always spawn this one — see below                                                       |

### Always spawn the consumer reviewer when a procedure is removed or renamed

Guild Collective deliberately deferred `guild.getPublicClubTeamRoster` and added
a test asserting its absence. Nothing in that feature bundle mentioned
`apps/club`, which calls it — so the Club team page rendered an empty roster from
the merge until someone finally ran `pnpm typecheck` unfiltered.

The feature artifacts captured the decision perfectly and still could not catch
it, because nothing asked **who else calls this**. So the reviewer asks:

```bash
rg -n 'api\.<namespace>\.<procedure>' apps packages --glob '!**/node_modules/**'
```

across every app, not just the one in the diff. `apps/club` and `apps/guild`
deploy separately and reach Blade over HTTP, so a break there is invisible to
Blade's own tests.

## Tiers

Default to **standard**. Say which tier you ran.

- **quick** — static gate plus one diff-hygiene reviewer. For small or mechanical
  changes. Roughly 1 agent.
- **standard** — static gate plus the scope-derived reviewers above. Roughly 3-6
  agents. This is the default.
- **deep** — standard plus an adversarial pass: every finding goes to a separate
  agent instructed to **refute** it, and a finding that cannot survive is
  dropped. Reserve for changes touching auth, payments, data migrations,
  uploads, cross-package contract removals, or other broad production risk.

Adversarial verification is not ceremony. On the dead-code audit it killed 8 of
roughly 85 candidates, including several that every mechanical signal called dead.

## What reviewers check that tools cannot

Do not ask an agent to find what `tsc` or ESLint already finds. Scope every
reviewer to judgment.

**Access.** Every `permProcedure` must call `permissions.controlPerms.or(...)` or
`.and(...)` near the top, before any work. Access is two named tiers:
_capability_ is a union across all of a user's roles and gates whether a route is
reachable at all; _scope_ is an exact match against the granting role and gates
which rows are visible. Only `issues` and `forms` have a scope tier. A nav gate
using capability while the server scopes per-role produces a page that loads
blank — check both sides agree.

**Audit.** Every `permProcedure` mutation, and any `protectedProcedure` mutation
that deletes data or moves money, writes an audit event via
`createAdminAuditEvent`. New permission-aware procedures must be declared in
`packages/api/src/utils/audit/coverage.ts`; the coverage test discovers routers
from disk and will fail otherwise.

**Placement.** Extract to `utils/<domain>/` when the logic can be tested without
a tRPC context; keep it in the procedure when it cannot. A `utils/<domain>/` file
holds one cohesive concern — if you cannot name it without "and", split it.
Cross-package imports go through the package export, never a relative path into
another package's `src/`.

**React.** No page-level `"use client"`. Classify state before choosing a
pattern and count per component, not per file: independent form fields stay as
they are or collapse into one object; one collection mutated by many handlers is
a reducer; several booleans describing one process are a status union. Do not
introduce `useActionState`, `useFormStatus`, `useOptimistic`, or
`<form action>` — this app routes every mutation through tRPC and those
primitives are FormData-shaped, reset uncontrolled fields, and escalate errors
past the toast layer. Mutation state comes from `mutation.isPending`.

**Test quality.** A test asserting a Tailwind class string, a pixel measurement,
or a bespoke `data-*` anchor is not coverage — it fires on behavior-preserving
changes and stays silent on real ones. jsdom tests exist only for invariants that
survive a redesign: permission gates, destructive-action guards, payment and
data-loss prevention. Query by role and accessible label.

**Readability.** Contributors are students, many still learning. Comments should
explain why a boundary exists, not restate the next line. If a change adds a
concept a first-year contributor could not follow, that is a finding.

## Reporting

Rank most severe first. For each finding give the `path:line`, a one-sentence
statement of the defect, and a concrete failure scenario — inputs or state
leading to a wrong result. A finding without a failure scenario is an opinion;
either make it concrete or drop it.

State plainly what you did **not** review. A review that implies more coverage
than it had is worse than a narrow one.
