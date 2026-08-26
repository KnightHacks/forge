# Club Event Details and Date Layout SRD

Status: Approved

## Technical purpose

Compose the existing public Club event data into reusable, accessible date and
details UI used by each Club event surface.

## Relevant principles

- [React and Next.js principles](../../../docs/agentic-development/forge-engineering-principles.md#react-and-nextjs-principles)
- [Sharing and package boundaries](../../../docs/agentic-development/forge-engineering-principles.md#sharing-and-package-boundaries)
- [Frontend design skill](../../../docs/agentic-development/frontend-design-skill.md)

## Access policy

The surfaces and event details remain public and unauthenticated. No logged-in,
officer, admin, or permission-based behavior is added.

## Architecture / data flow

`apps/club` continues to load `PublicClubEvent` records through the existing
Blade tRPC client. New composed UI stays in `apps/club/src/app/_components`
because it is specific to the Club theme and used only by Club. The existing
app-agnostic dialog primitive remains in `@forge/ui` unchanged.

## tRPC/API behavior

No tRPC or API changes. The existing `event.getPublicClubEvents` response and
Club normalization remain unchanged.

## Validation

No new inputs or data mutation. Continue rendering the normalized
`PublicClubEvent` type without adding a validator.

## Data / migration / compatibility

No data, environment, configuration, or migration changes. The implementation
can be rolled back as an isolated Club UI diff.

## Discord integration

None.

## Configurability review

Would this require a developer change next year?

- Answer: No. Event content remains managed through Blade. The change only
  controls how existing public data is presented.
- If yes, why is hard-coding acceptable or what admin-configurable path is planned?
  Not applicable.

## React / frontend constraints

- Keep pages server-side and keep interactivity inside the existing client
  components.
- Add no client state beyond the shared Radix dialog's state.
- Reuse `@forge/ui/dialog`, `MarkdownContent`, Club color tokens, button
  treatment, typography, and reduced-motion behavior.
- Keep two-line previews as the row density strategy; show complete content in
  a bounded, scrollable dialog.
- The dialog needs an accessible title and description, focus management,
  Escape dismissal, and a visible close control.
- A reusable Club date component owns the month/day/weekday ordering across all
  event surfaces.

## Testing / verification strategy

- Add Vitest coverage under `apps/club/src/tests` for semantic date ordering,
  the accessible `View details` trigger, and complete details content.
- Use Playwright against the local Club server to verify opening and dismissing
  the dialog on the homepage and Events page at desktop and mobile widths.
- Run `pnpm --filter=@forge/club test`, `pnpm analyze:react:changed`, and
  `pnpm verify:precommit`.

## Open questions

- None.
