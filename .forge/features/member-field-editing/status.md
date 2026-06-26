# Member Field Editing Status

Current phase: Implemented / validated

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision Log

- 2026-06-26: Created branch `reforge/member-field-editing-spec` from clean `reforge/main`.
- 2026-06-26: Selected self-service member profile editing as the next member slice after initial onboarding.
- 2026-06-26: Accepted that all member-owned fields should be editable, including official member info, academics, Guild fields, profile picture, and resume.
- 2026-06-26: Chose a dedicated member settings page instead of inline dashboard editing.
- 2026-06-26: Chose a lightweight cog/settings action on the dashboard as the edit entry point.
- 2026-06-26: Accepted that the member settings page should visually connect to both the dashboard and the signup form.
- 2026-06-26: Accepted Personal, Academics, and Guild sections matching the signup flow.
- 2026-06-26: Chose one save action for non-upload member fields, not per-section saves.
- 2026-06-26: Chose to stay on the member settings page after successful save with an easy path back to dashboard.
- 2026-06-26: Accepted dirty-state handling, including a whole-form reset/undo and navigation warning where practical.
- 2026-06-26: Chose not to show Code of Conduct acceptance again on edit; it remains signup-only evidence.
- 2026-06-26: Accepted that edit initial values come from the `Member` table, not from `FormResponse`.
- 2026-06-26: Accepted that saving edits updates an existing member signup `FormResponse`.
- 2026-06-26: Accepted that saving edits backfills a member signup `FormResponse` for legacy/prod members with a `Member` row but no response.
- 2026-06-26: Accepted adding a generic forms-manager `updateResponse` capability now.
- 2026-06-26: Accepted a single DB transaction for `Member` update plus `FormResponse` update/backfill.
- 2026-06-26: Accepted keeping profile-picture and resume controls as immediate-save upload flows, including on the member settings page.
- 2026-06-26: Accepted that profile-picture/resume upload behavior stays outside the save-all dirty state.
- 2026-06-26: Accepted refreshing `discordUser` from the current session during update.
- 2026-06-26: Accepted recomputing `age` from `dob` during update.
- 2026-06-26: Accepted a new member edit/update validator derived from the same constraints as signup, minus Code of Conduct.
- 2026-06-26: Accepted preserving email and phone uniqueness while allowing unchanged values.
- 2026-06-26: Accepted focused tests plus Playwright coverage for every feature slice.
- 2026-06-26: Legacy research confirmed that legacy `/settings` updated `Member` without updating `FormResponse`, had visual drift, and reused ambiguous update paths across self-service/admin editing. This feature should avoid those debts.
- 2026-06-26: Revised route namespace for member-facing pages: `/member/dashboard` and `/member/settings` are canonical, with old `/dashboard`, `/settings`, and `/settings/profile` paths redirecting during transition.
- 2026-06-26: Accepted writing `codeOfConductAccepted: true` for legacy/prod member signup response backfills that have no prior response.
- 2026-06-26: Implemented member field editing with canonical `/member/dashboard` and `/member/settings` routes, dashboard settings cog, same-section settings form, generic forms-manager response update/backfill, and transaction-scoped member/response sync.
- 2026-06-26: Added focused validator/API/Blade unit tests and Playwright integration coverage for route redirects, prefill source, save/sync, legacy backfill, dirty/reset behavior, duplicate safety, and settings-page uploads.
- 2026-06-26: Added visible enter/exit transitions to the authenticated member page surface, triggered by the dashboard settings cog and settings back-to-dashboard action.
- 2026-06-26: Aligned signup Guild upload UI with the member update flow by reusing the profile-picture and resume upload components in deferred-save mode.
- 2026-06-26: Added a non-production `?latency=2500` / `?debugLatency=2500` route delay for `/member/dashboard` and `/member/settings` so loading and skeleton states can be inspected intentionally.
- 2026-06-26: Accepted self-service profile deletion for data-retention requests from `/member/settings`.
- 2026-06-26: Chose to delete the current user's member signup response, member row, auth permissions, and auth user in one transaction, then clear the browser session and return to `/`.
- 2026-06-26: Chose best-effort cleanup for owned profile-picture and resume objects after the database deletion commits.

## Resolved Implementation Shape

- Routes: `/member/dashboard` and `/member/settings`.
- Dashboard entry: small cog/settings link.
- Primary mutation: `member.updateMember`.
- Delete mutation: `member.deleteMember`.
- Generic form support: add `forms.updateResponse` service/capability in the forms manager.
- Consistency model: update `Member` and update/backfill member signup `FormResponse` in one transaction.
- Deletion model: delete member signup `FormResponse`, `Member`, auth permissions, and auth `User` in one transaction, then sign out.
- Initial values: source from `Member`.
- Uploads: reuse profile-picture and resume routers/components as immediate-save flows.
- Admin editing: out of scope.

## Artifact Task List

- [x] Create `.forge/features/member-field-editing/`.
- [x] Draft `status.md` with accepted decisions and open questions.
- [x] Reverse-prompt on scope, route, sections, save model, response sync, uploads, validation, tests, and legacy behavior.
- [x] Inspect current Reforge member schema, validators, routers, forms manager, dashboard, and upload boundaries.
- [x] Inspect legacy profile editing and form-response behavior with a read-only explorer.
- [x] Draft `spec.md`.
- [x] Draft `srd.md`.
- [x] Draft `test-cases.md`.
- [x] Human review of artifact direction.
- [ ] Commit artifact branch after implementation validation.

## Implementation Task List

- [x] Add member edit/update validator.
- [x] Add generic forms response update/upsert service.
- [x] Add `member.updateMember`.
- [x] Move canonical dashboard route to `/member/dashboard`.
- [x] Add `/member/settings` page.
- [x] Add redirect shims from `/dashboard`, `/settings`, and `/settings/profile`.
- [x] Update sign-in callback and signup completion redirect targets to `/member/dashboard`.
- [x] Add profile settings form component.
- [x] Add dashboard cog/settings action.
- [x] Reuse profile-picture upload control on settings.
- [x] Reuse resume upload control on settings.
- [x] Add dirty-state and whole-form reset behavior.
- [x] Add destructive profile deletion UI.
- [x] Add `member.deleteMember`.
- [x] Add upload-object cleanup for profile deletion.
- [x] Add profile deletion tests.
- [x] Add focused validator tests.
- [x] Add API tests for member update, form response update/backfill, rollback, and uniqueness.
- [x] Add Blade component tests for profile settings UI.
- [x] Add Playwright e2e tests for edit and backfill flows.
- [x] Run lint/typecheck/test/e2e validation.

## Validation Log

- 2026-06-26: `pnpm --filter=@forge/validators test` passed.
- 2026-06-26: `pnpm --filter=@forge/validators typecheck` passed.
- 2026-06-26: `pnpm --filter=@forge/api test` passed.
- 2026-06-26: `pnpm --filter=@forge/api typecheck` passed.
- 2026-06-26: `pnpm --filter=@forge/blade test` passed.
- 2026-06-26: `pnpm --filter=@forge/blade typecheck` passed.
- 2026-06-26: Package `format`, `lint`, `typecheck`, and `test` scripts passed for `@forge/validators`, `@forge/api`, and `@forge/blade`.
- 2026-06-26: `pnpm --filter=@forge/blade e2e` passed, 21 tests, after formatting.
- 2026-06-26: `pnpm analyze:react apps/blade/src/app/_components/member apps/blade/src/app/member apps/blade/src/hooks` passed with 0 failures.
- 2026-06-26: `git diff --check` passed.
- 2026-06-26: After the animation/upload parity pass, `pnpm --filter=@forge/blade typecheck`, `pnpm --filter=@forge/blade test`, `pnpm --filter=@forge/blade format`, `pnpm --filter=@forge/blade lint`, `pnpm --filter=@forge/blade e2e`, and the React analyzer passed.
- 2026-06-26: Profile deletion extension: `pnpm --filter=@forge/api test -- member/router` passed.
- 2026-06-26: Profile deletion extension: `pnpm --filter=@forge/blade test -- member-profile-settings-form` passed.
- 2026-06-26: Profile deletion extension: `pnpm --filter=@forge/api typecheck`, `pnpm --filter=@forge/blade typecheck`, `pnpm --filter=@forge/api lint`, `pnpm --filter=@forge/blade lint`, `pnpm --filter=@forge/api format`, `pnpm --filter=@forge/blade format`, and `git diff --check` passed.
- 2026-06-26: Profile deletion extension: `pnpm --filter=@forge/blade e2e -- member-field-editing.spec.ts` passed, 22 tests. The command also ran the member onboarding e2e spec because of the current Playwright argument handling.

## Open Questions

- Should the old `/dashboard`, `/settings`, and `/settings/profile` compatibility redirects be permanent or removed after Reforge cutover?
