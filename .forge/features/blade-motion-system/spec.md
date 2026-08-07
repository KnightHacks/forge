# Blade Loading and Motion System Spec

Status: Approved

## User-facing purpose

Blade should feel responsive and polished while preserving the stable geometry expected from an operational dashboard. Pages that wait on data should render a representative skeleton, and motion should clarify navigation, loading, direct manipulation, and successful operations.

## Users / actors

- Members using the dashboard, dues, settings, forms, and public Blade pages.
- Officers using admin tables, hackathon event publication, check-in, logs, analytics, forms, and issue workflows.
- Visitors viewing the Blade landing and sponsorship pages.

## User-visible interface

- Structurally accurate route, dialog, panel, and option-list skeletons.
- Coordinated page and scroll reveals on public Blade pages.
- Short transitions for explicitly switched views and direct manipulation.
- Retained table content with a clear updating state during refetches.
- Check-in and publication progress feedback that makes operational state changes easy to follow.
- Motion that respects the operating system reduced-motion preference.

## Scope

### In scope

- Missing async route skeletons for member, form, and hacker routes.
- Replacement of spinner-only intermediate states where the final geometry is known.
- Public landing and sponsorship entrance/intersection motion.
- Check-in camera, result, and recent-history feedback.
- Hackathon event publication progress.
- Retained-content loading transitions for major filtered workspaces.
- Local tab/view transitions, submission feedback, and drag affordances.
- Reduced-motion behavior for animated shared primitives used by Blade.

### Out of scope

- New business capabilities, data models, API procedures, or permissions.
- Ambient animation across dense admin pages.
- Per-row entrance staggers for operational tables.
- Animated analytics values or charts.
- Animation of live scanner video.

## Vocabulary

- `route skeleton`: an App Router loading state that mirrors the eventual page structure.
- `retained-content loading`: keeping existing results visible during a refetch while indicating that they are stale.
- `reveal`: a one-time opacity and small vertical translation when public content enters the viewport.
- `direct interaction motion`: short feedback caused by a user's click, drag, toggle, or successful operation.

## Acceptance criteria

- Every non-static, non-redirect Blade route has an intentional loading experience.
- Skeleton geometry remains close to the final desktop and mobile structure.
- Spinner-only full-surface states are replaced with representative skeletons where practical.
- Public Blade sections enter with restrained, coordinated motion.
- Filter and pagination updates retain existing records and expose an accessible busy state.
- Check-in and publication workflows communicate progress without delaying operation.
- Dragged objects and valid receiving targets are visually distinguishable.
- Reduced-motion users receive immediate state changes without unnecessary translation, pulsing, or navigation delay.

## Open questions

- None. The user approved the audited scope on 2026-08-07.
