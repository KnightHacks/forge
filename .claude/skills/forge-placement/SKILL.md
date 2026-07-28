---
name: forge-placement
description: Deciding where code goes — constants, helpers, components, and shared packages. Use whenever adding a helper, constant, type, or component, or when unsure which package owns something. Answers "where does this go?" without needing to read a doc.
---

# Forge Placement

Seventeen features were built independently, and each one had to answer "where
does this go?" alone. The cheapest local answer is always "next to me," so the
repo accumulated 15 differently-named helper modules under `_components/**`, none
called `utils.ts`, while `apps/blade/src/lib` held 62 lines.

The rules below exist so that question has one answer.

## The tiebreaker that was missing

Two principles used to pull against each other with nothing to arbitrate:
"`@forge/utils` should not become a junk drawer" and "do not duplicate." Faced
with a maybe-reusable helper, the safe reading was "don't pollute utils," so
seventeen features each kept it local. That produced underuse and duplication at
the same time.

The tiebreaker:

> **Promote on the second consumer, not the first.** Write it local. When a
> second place needs it, move it up one tier and update both. Do not promote
> speculatively, and do not copy instead of promoting.

One caveat that overrides it: if the copies would **diverge** — validation rules,
escaping, anything security- or data-shaped — promote immediately, even at one
consumer. Five CSV escapers with four different formula-injection guards is what
"copy for now" actually costs.

## Constants

| Scope                    | Home                                        |
| ------------------------ | ------------------------------------------- |
| One file                 | local `const` at the top                    |
| Several Blade files      | `apps/blade/src/consts/`                    |
| Several apps or packages | `packages/consts/src/*` via `@forge/consts` |

The middle tier is real and is where most things belong. Its absence is why
constants ended up hiding inside component modules — `ADMIN_PAGE_EYEBROWS` lived
in `admin-page.tsx` with 18 importers.

`@forge/consts` holds shared literals, option lists, enum sources, IDs, and
permission metadata. It must not hold React prop types or Tailwind class maps.

**A value two processes must agree on is a contract, not a constant.** Cookie
names, localStorage keys, header names: one declaration, imported by both sides.
Two independent declarations of the same cookie name is a handshake that breaks
silently.

**Organizational state is not a constant.** If it changes by semester,
hackathon, officer team, sponsor cycle, role, event, season, or Discord server
config, it belongs in an admin-managed table. The test: _would this require a
developer change next year?_ If yes, either move it or write down in the SRD why
hard-coding is acceptable.

## Helpers

| Scope                    | Home                                      |
| ------------------------ | ----------------------------------------- |
| One feature              | a file beside the feature                 |
| Several Blade features   | `apps/blade/src/lib/<topic>.ts`           |
| Several apps or packages | `packages/utils/src/*` via `@forge/utils` |

Name the file for its topic — `lib/dates.ts`, `lib/admin-access.ts` — so a
newcomer can guess it. Fifteen unique names (`params.ts` ×5, `types.ts` ×2,
`server-adapters.ts`, `sign-out-flow.ts`) meant there was no name to grep for.

`@forge/utils` is for genuinely app-agnostic behavior. If a helper imports
`~/env` or Blade-shaped types, it is Blade-local and promoting it would drag app
concerns into a shared package.

Server-only utilities stay behind explicit server-only subpath exports. Nothing
that touches the database, cookies, or a service client may reach a client
bundle through a barrel.

## Components

- Blade UI lives in `apps/blade/src/app/_components/**`, grouped by feature.
- `_components/shared/` is for genuinely Blade-wide pieces — app chrome,
  navigation, page scaffolding. Not a second junk drawer.
- `@forge/ui` is app-agnostic primitives only. A composed, domain-aware component
  belongs in Blade even if two apps might want it one day.
- A module with no JSX is not a component. It goes in `lib/`, not
  `_components/`.

Files and directories are kebab-case. There are no index barrels — do not add
one.

## Package boundaries

| Package             | Owns                                        | Must not own                        |
| ------------------- | ------------------------------------------- | ----------------------------------- |
| `@forge/consts`     | shared literals, enum sources, IDs          | DB, API, auth, or UI logic          |
| `@forge/validators` | shared Zod schemas, pure validation helpers | business logic, constants           |
| `@forge/db`         | Drizzle schemas, client, migrations         | product queries, workflows          |
| `@forge/auth`       | session and token helpers                   | app UI, feature workflows           |
| `@forge/api`        | routers, procedures, API-side workflows     | app components, schema ownership    |
| `@forge/utils`      | reusable non-UI helpers                     | shared constants, UI                |
| `@forge/ui`         | app-agnostic primitives                     | Blade-specific UI, server-only deps |
| `@forge/email`      | email clients, templates                    | general app workflows               |

Import across packages through the package export, never a relative path into
another package's `src/`. Lint enforces this. It is not style: a relative hop
bypasses the exports map, hides the edge from Turbo's build graph (which keys off
`dependencies`), and can create a cycle nothing reports.

**Before declaring a new `@forge/*` dependency, check the reverse direction.**
`@forge/auth` needed `@forge/utils`, and declaring it honestly made Turbo reject
the whole graph as cyclic — `@forge/utils` depended back on `@forge/auth` for one
type-only import, which the relative path had been hiding. If declaring an edge
creates a cycle, the relative import was concealing a design problem; fix the
direction rather than the import.

## Before you add anything

Search first. `@forge/utils` accumulated dead exports while the same
capabilities were re-implemented in apps — `validateAssigneesBelongToTeam` sat
unused while a near-identical hand-rolled copy ran at three call sites. The
convention had pointed at a shelf nobody trusted.

If a package export looks wrong for your case, say so in the PR rather than
writing a fourth copy.
