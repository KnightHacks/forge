---
name: forge-react
description: How to build and change React in apps/blade: component structure, classifying state, custom hooks, the server/client boundary, mutation UX, and splitting oversized components without changing how pages look. Use this whenever writing or editing a component, adding useState/useEffect/useReducer, wiring a mutation, deciding whether data should load on the server or client, or breaking up a large file. Also use it whenever someone proposes a React feature like Suspense, useActionState, useOptimistic, or a state library — this codebase has decided against several of those and the reasons matter.
---

# Forge React

Blade's problem was never that components are big. It is that almost nothing in
them had a name. 322 `useState` calls against 3 custom hooks is the whole
diagnosis: logic was anonymous, inlined, and therefore untestable and
unreviewable. `analytics-dashboard.tsx` is 2,503 lines with only 7 `useState` —
not a state problem at all, just a lot of nameless JSX.

So this is mostly about naming things and putting them where a test can reach
them. It is not an invitation to introduce patterns.

## Do not reach for these

Verified against react.dev and the codebase, not assumed:

**No `useActionState`, `useFormStatus`, `useOptimistic`, or `<form action={fn}>`.**
These are not server-action-gated — that part is a myth — but they are wrong
here for concrete reasons. They are FormData-shaped and Blade's fields are
controlled Radix components with `Date`-typed tRPC inputs. `<form action>` resets
uncontrolled fields on success, which is an observable behavior change.
`useFormStatus` reads only a parent `<form>`'s action status, and 161 `isPending`
sites have no such parent. Errors thrown inside an Action escalate to
`error.tsx` instead of the app's toast layer.

**No `<Suspense>`.** Pages await all their tRPC reads before rendering, so a
boundary around a client component receiving resolved props never shows its
fallback. The zero count is a consequence of server-read-to-props, not a gap.

**No client state library.** Every piece of state here is scoped to one subtree,
and shared server state is already owned by tRPC + TanStack Query. That split is
correct.

**No React Compiler yet, and do not strip existing `useMemo`/`useCallback`.**
React's own guidance is to leave memoization in place.

## State: classify before choosing a pattern

Count `useState` **per component, not per file** — the headline counts were per
file, and a split changes them on its own. react.dev gives no numeric threshold
and closes its reducer page with "it's a matter of preference." The criteria are
about update _shape_.

Three buckets:

**Independent fields seeded from a record.** 74 of 288 `useState` initializers in
Blade are this. Leave them alone or collapse into one object plus a typed
`update(key, value)` helper — copy `event-form-dialog.tsx`, which holds an entire
event form in one `useState<EventFormValue>`. A reducer here only renames
`setName(v)` to `dispatch({type:'setName'})`: a large diff, no behavior change.

**One collection mutated by many handlers.** This is reducer shape. It occurs
exactly once in Blade — the `questions` array in `admin-form-builder.tsx`, with
seven `setQuestions` sites doing add, remove, reorder, and nested patch. Keep it
that way; do not add a second reducer until another collection demonstrably has
the same profile.

**Several booleans describing one process.** If two booleans can never be true at
once, they were never two booleans. Replace with a status union:
`useState<'idle'|'saving'|'error'>('idle')`. This is the most teachable rule
here and the cheapest to review.

## Effects

Do not add a prop-to-state sync effect. If a component seeds state from props
once and never resyncs, that is deliberate — `router.refresh()` runs after every
save and a resync would clobber in-progress edits. To reset a subtree when the
underlying record changes, pass `key={record.id}`.

The linter will not catch this for you. `eslint-plugin-react-hooks` 7 runs
`set-state-in-effect` at error, and it fires for `useEffect(() => setV(1))` but
**not** for `useEffect(() => { setV(x) }, [x])` — the prop-mirroring form. Verified
by repro.

## Custom hooks

Extract one only when the logic is used by 2+ components, or when it subscribes
to something outside React (localStorage, a timer, an event listener, an
observer). Name it for the feature — `useIssueStatus`, `useAudienceResolution` —
never `useMount`, `useUpdateEffect`, or `useSyncedState`. If the extracted
function calls no hooks, drop the `use` prefix.

With 46 effects and 3 hooks, the temptation during a refactor is to mass-extract.
That would replace 11 large components with 11 large components plus 40 thin
indirection layers.

## Mutations

One shape, everywhere: `api.x.y.useMutation({ onSuccess, onError })` with a
toast from `@forge/ui/toast`, and `mutation.isPending` for the pending state.
Inline errors are only for field-level validation inside a form. Before this rule
there were 15 toast and 14 inline sites across 8 different state-variable names,
and the events feature was split against itself.

**There is no `useFeatureMutation` wrapper — do not import one.** An earlier
version of this skill prescribed it as though it existed. It does not, and every
screen hand-rolls the call above. Build the wrapper only as its own deliberate
refactor of the existing sites, never as a side effect of a feature.

Row-level actions need their own `useState<string | null>` holding the pending
row id, because one `useMutation` object is shared across every row. There is no
shared helper for this; each screen declares its own.

Do not add optimistic updates. There are none in `apps/blade` — no `onMutate`,
no `setQueryData`, no `useOptimistic` — and the house pattern is pending state
plus a refresh.

Match the invalidation mechanism to where the data came from:

- rendered from an RSC prop → `startTransition(() => router.refresh())`
- fetched with `api.x.useQuery` → `await utils.x.invalidate()`

These are disjoint caches. `router.refresh()` returns void, so a transition's
`isPending` is the only supported way to know it landed; without it the save
button re-enables while stale data is still on screen. Drive disabled state from
both: `disabled={mutation.isPending || isRefreshing}`.

## The server/client boundary

Pages and layouts never carry `"use client"`. Pages own routing, auth gates,
redirects, server reads, and composition; interactivity lives in a rendered
component. This holds today across all 35 pages and 4 layouts — keep it.

Server-read data reaches the client as props. Do not refetch on the client what
the page already read on the server.

## Splitting a large component

Extract in order of provability, and never faster than you can prove:

1. **Pure code** — no React import. Provable by a plain unit test under the
   existing node environment. No jsdom needed, so this can start immediately.
2. **Hooks** — move `useState`/`useEffect` into a named function; JSX stays put.
   The DOM cannot change, so a byte-identical SSR HTML diff is a complete proof.
3. **JSX** — the only tier that can change pixels, and the only one needing
   jsdom, Testing Library, and screenshots.

The enemy is specific. Blade's layout is built on sibling-scoped Tailwind:
`adminPageLayoutClassName` ends in `space-y-4 sm:space-y-6`, which is `> * + *`
and applies only to direct children. Adding one wrapper `<div>` silently removes
a gap. `divide-y` and `first:border-l-0` fail the same way. So **an extracted
child returns a fragment or the exact single root the parent used** — never a new
wrapper, never two former siblings grouped under one new parent.

Two more that produce no type error, no lint error, and no test failure:

- **A submit button stays inside its `<form>`.** Implicit form association is
  invisible in JSX; a bare `type="submit"` works only through DOM ancestry. Move
  it out and it silently stops doing anything.
- **Preserve mount conditions and `key` props exactly.** Mount identity is what
  resets a form between records, keeps a render-time browser read off the server,
  and lets Radix restore focus to the right trigger.

A refactor commit changes structure, never pixels. If you find a bug while
moving code, write a characterization test pinning today's behavior, land the
move green, then fix it in a separate commit whose diff is small enough to read.
