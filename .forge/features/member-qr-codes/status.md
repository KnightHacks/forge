# Member QR Codes Status

Current phase: Complete

> This file is the maintained progress tracker for the feature/change. Keep it current whenever decisions, tasks, validation, or open questions change.

## Decision log

- 2026-07-15: Human confirmed the feature bundle is complete; normalized all
  artifact status fields to `Complete`.
- 2026-06-26: Created branch `reforge/member-qr-codes-spec` from `reforge/main`.
- 2026-06-26: Restarted the feature through the Forge artifact flow after reverting premature implementation work.
- 2026-06-26: Instantiated `.forge/features/member-qr-codes/` with `pnpm forge:feature member-qr-codes "Member QR Codes"`.
- 2026-06-26: Human answered first reverse-prompt round: QR should be one stable code per auth `User`, encode the raw `User.id`, be generated for authenticated users even before member profile creation, be viewable only after member profile creation, use deterministic MinIO storage without a DB column, be prominent on the member dashboard, be cleaned up on account deletion, exclude scanner/admin flows, and have both mocked and live-storage-oriented coverage.
- 2026-06-26: Legacy review found that old Blade stored a QR during first member/hacker profile creation but dashboard QR display generated a fresh data URL instead of retrieving the stored MinIO object.
- 2026-06-26: Storage decision reopened after review. Because QR content is deterministic from `User.id`, the feature may not need MinIO storage at all.
- 2026-06-26: Human approved no QR storage. Reforge should generate the member-dashboard QR on demand from raw `User.id`, and legacy MinIO QR storage should be called out as deprecated.
- 2026-06-26: Review polish restored centered fade/zoom animation to the shared dialog primitive and moved the desktop QR action from a full-width inset section into the member dashboard welcome row.

## Open questions

- None currently.

## Task list

- [x] Complete reverse-prompting for `spec.md`.
- [x] Complete reverse-prompting for `srd.md`.
- [x] Complete reverse-prompting for `test-cases.md`.
- [x] Human approves artifact bundle before implementation/test generation.
- [x] Implement on-demand QR query.
- [x] Add dashboard QR dialog component.
- [x] Place QR action in desktop and mobile dashboard views.
- [x] Add focused tests.
- [x] Run validation.

## Validation / commands

- 2026-06-26: `pnpm forge:feature member-qr-codes "Member QR Codes"` created the artifact bundle.
- 2026-06-26: `pnpm prettier --write .forge/features/member-qr-codes/spec.md .forge/features/member-qr-codes/srd.md .forge/features/member-qr-codes/test-cases.md .forge/features/member-qr-codes/status.md packages/api/src/root.ts packages/api/src/routers/qr.ts packages/api/src/tests/qr/router.test.ts apps/blade/src/app/_components/member/member-qr-code-dialog.tsx apps/blade/src/app/_components/member/member-dashboard.tsx apps/blade/src/app/_components/member/dashboard-client.tsx apps/blade/src/tests/member/member-dashboard.test.tsx apps/blade/src/tests/e2e/member-onboarding.spec.ts apps/blade/src/tests/e2e/mobile-member-experience.spec.ts`: passed.
- 2026-06-26: `pnpm --filter=@forge/api test -- qr`: passed, 1 file / 3 tests.
- 2026-06-26: `pnpm --filter=@forge/blade test -- member-dashboard`: passed, 1 file / 3 tests.
- 2026-06-26: `pnpm --filter=@forge/api typecheck`: passed.
- 2026-06-26: `pnpm --filter=@forge/blade typecheck`: passed.
- 2026-06-26: `pnpm --filter=@forge/blade lint`: passed.
- 2026-06-26: `pnpm --filter=@forge/blade format`: passed.
- 2026-06-26: `pnpm analyze:react:changed --base=reforge/main`: passed, 3 files analyzed, 0 failures.
- 2026-06-26: `pnpm analyze:react apps/blade/src/app/_components/member/member-qr-code-dialog.tsx`: passed, 1 file analyzed, 0 failures.
- 2026-06-26: `pnpm --filter=@forge/api lint`: passed.
- 2026-06-26: `pnpm --filter=@forge/api format`: passed.
- 2026-06-26: `BLADE_E2E_AUTH=true NEXT_PUBLIC_BLADE_E2E_AUTH=true BLADE_E2E_DEFAULT_USER_ID=00000000-0000-4000-8000-000000000101 pnpm with-env playwright test member-onboarding.spec.ts mobile-member-experience.spec.ts`: passed, 19 tests.
- 2026-06-26: `git diff --check`: passed.
- 2026-06-26: QR/dialog polish: `pnpm --filter=@forge/blade test -- member-dashboard`, `pnpm --filter=@forge/blade typecheck`, `pnpm --filter=@forge/ui typecheck`, `pnpm --filter=@forge/blade lint`, `pnpm --filter=@forge/blade format`, `pnpm --filter=@forge/ui lint`, `pnpm --filter=@forge/ui format`, and `pnpm analyze:react apps/blade/src/app/_components/member/member-qr-code-dialog.tsx apps/blade/src/app/_components/member/member-dashboard.tsx apps/blade/src/app/_components/member/dashboard-client.tsx` passed.

## Links

- PRs:
- Issues:
- Discord/thread context:
