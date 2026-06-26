# Initial Member Onboarding Status

Current phase: Draft artifact bundle / reverse-prompting

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-06-25: First Reforge feature candidate selected as the initial member flow: landing page, Discord sign-in, member profile signup, and member dashboard.
- 2026-06-25: Explicitly excluded hacker applications, dues/payment, uploads, admin, permissions management, events, general-purpose forms, judging, and sponsor surfaces from this first slice.
- 2026-06-25: Used the repo's Forge artifact-writing skill guidance for spec, SRD, and test-case drafting.
- 2026-06-25: Accepted Dylan's caveat that `User` is the auth/account profile and `Member` is member information linked to `User`.
- 2026-06-25: Accepted that the first signup should reuse the forms + callback model instead of a hard-coded member application component.
- 2026-06-25: Accepted real Discord auth as the authentication path; legacy auth/form code can be used as evidence without inheriting implementation debt.
- 2026-06-25: Accepted that member fields should come from the existing DB-backed member model and that a member validator may be added/updated.
- 2026-06-25: Reviewed legacy forms/callback flow and decided not to reuse client-side `handleCallbacks` as-is for member creation; member onboarding needs server-controlled callback execution and visible failure handling.

## Open questions

- Should the built-in member signup form live as a DB seed, code-owned form definition, or hybrid?
- Should callback execution happen inside `forms.createResponse`, an onboarding-specific submit procedure, or a shared server-side callback runner?
- Should form response persistence and member creation happen in one transaction?
- Should QR generation be deferred or preserved immediately?
- Should the first dashboard show only profile confirmation, or also include placeholders for future dues/events/member features?

## Task list

- [x] Instantiate `.forge/features/initial-member-onboarding/` artifact bundle.
- [x] Draft `spec.md` with user-facing scope and open questions.
- [x] Draft `srd.md` with technical constraints, access policy, and open questions.
- [x] Draft `test-cases.md` with observable behavior cases and negative cases.
- [x] Human answered initial caveat and form-driven onboarding direction.
- [x] Incorporate initial caveat, User/Member split, DB-schema reuse, validators, real Discord auth, and form-callback direction into artifacts.
- [ ] Resolve remaining form runtime architecture questions.
- [ ] Revise artifacts after remaining architecture/dashboard decisions.
- [ ] Human approves artifact bundle before implementation/test generation.

## Validation / commands

- `pnpm forge:feature initial-member-onboarding "Initial Member Onboarding"`: blocked locally because `pnpm` is not on PATH in this shell.
- Manual scaffold created with `apply_patch`.

## Links

- PRs:
- Issues:
- Discord/thread context:
