# Mobile Member Experience SRD

Status: Implemented / validated

> This file owns technical implementation constraints and accepted architecture for this feature slice.

## Technical Purpose

Improve the mobile Blade member experience across the existing member flow without changing member data architecture:

```txt
/ -> Discord sign-in -> /form/member-signup -> /member/dashboard -> /member/settings
```

This is primarily a Blade frontend and design-system feature. API, auth, upload, and database behavior should remain unchanged unless a small frontend support hook/component is needed.

## Relevant Principles

- `docs/agentic-development/frontend-design-skill.md`: use the Blade design system before reshaping layouts.
- `apps/blade/DESIGN_SYSTEM.md`: surface hierarchy, dashboard cards, nested surfaces, typography, iconography, and motion expectations.
- `.forge/features/initial-member-onboarding/srd.md`: signup/dashboard/upload behavior.
- `.forge/features/member-field-editing/srd.md`: settings route, update behavior, deletion behavior, dirty state, and upload behavior.

## Access Policy

Access rules do not change in this slice.

- Public users may view public entry/sign-in surfaces only.
- Authenticated users without a member profile should still be routed to member signup.
- Authenticated members may view `/member/dashboard` and `/member/settings`.
- Profile update, profile deletion, resume upload, and profile-picture upload remain enforced server-side by existing procedures.

Client layout changes must not become access control.

## Architecture / Data Flow

Keep this feature in `apps/blade` unless implementation discovers a reusable `@forge/ui` primitive needs a small fix.

Expected work areas:

- member dashboard page/components
- member settings page/components
- member signup form rendering
- shared member upload/profile controls
- shared route transition link/surface components
- mobile skeleton components
- Blade design-system documentation
- Playwright e2e tests

No new database writes, tables, migrations, or tRPC business procedures are expected.

## Frontend Requirements

### Layout

- Treat mobile as a real layout, not only stacked desktop.
- Use responsive component structure where needed instead of only responsive utility classes on desktop markup.
- Keep top-level dashboard/settings surfaces aligned with the Blade card hierarchy:
  - top-level panels: lighter `bg-card/95`
  - nested rows/tiles/links: darker `bg-background/60`
- Avoid nested `Card` components inside dashboard cards.
- Use compact disclosure only when it genuinely improves a mobile workflow. Do not use disclosure controls for ordinary desktop dashboard member details.
- Keep touch targets at least 44px where practical.

### Dashboard

- Move the settings cog into the Guild/profile area for desktop and mobile.
- On mobile, render a lightweight Guild/social identity surface instead of stacking lower-priority member/account details below it.
- Make the Guild profile card compact but complete:
  - avatar/profile-picture control
  - name/tagline/company
  - profile links
  - resume action
  - settings cog
- Because the mobile dashboard now renders only the Guild/profile surface, the card should fill the available screen height and feel like an intentional profile screen.
- Render company as a nested inset card on mobile, matching links and resume. Avoid treating company as loose uppercase text under the tagline.
- Hide heavier member/account details from the mobile dashboard; keep them available in settings.
- On desktop, render member info and academics as normal visible panels, not drawers/disclosures.
- Avoid duplicate resume surfaces; resume actions should be compact and unambiguous.

### Signup And Settings Forms

- Signup and settings should share mobile spacing, section rhythm, and upload treatment.
- Add a mobile sticky bottom action area for settings save/update.
- Keep member signup submit as a normal bottom-of-form action.
- Keep reset/undo/destructive actions available without crowding the sticky primary action.
- Inputs/selects/textareas should not jump parent hover/active styling on interaction.
- Profile picture and resume controls should follow the settings flow's current mobile-friendly treatment in both signup and settings.

### Dialogs

- Dialog components should open from the visual center and fit inside small mobile screens.
- Use safe viewport padding on mobile.
- Resume viewer should use the available viewport height without clipping controls.
- Dirty-changes and delete-confirmation dialogs should keep primary actions reachable with one hand where practical.

### Skeletons And Loading

- Skeleton components must match the loaded structure and approximate height.
- Do not animate loaded cards into an empty skeleton gap.
- Prefer content replacement or subtle opacity changes inside stable containers.
- The debug latency query supported by dashboard/settings may be used during validation.

### Motion

- Preserve the existing dashboard/settings route transition.
- Do not add per-card entrance animations that compete with skeleton replacement.
- Gate route-level motion behind reduced-motion support where available.

## tRPC / API Behavior

No new tRPC procedures are expected.

Existing procedures used by the affected surfaces remain:

- `member.getMember`
- `member.updateMember`
- `member.deleteMember`
- `resume.*`
- `profilePicture.*`
- `forms.*` for signup rendering/submission

If implementation requires new client-only shape helpers, prefer local Blade utilities/hooks. Do not add API fields only to make layout easier unless there is a real product need.

## Validation

No new validator package behavior is expected.

Existing member/signup/settings validators must continue to run unchanged. Mobile layout must not bypass required fields, dirty state, Code of Conduct acceptance on signup, upload validation, or destructive confirmation.

## Data / Migration / Compatibility

- No schema changes.
- No migrations.
- No auth changes.
- No upload storage changes.
- Existing desktop behavior should remain compatible.
- Existing redirects and canonical routes from member field editing remain unchanged.

## Configurability Review

Would this require a developer change next year?

- Answer: Yes, for layout and visual-density changes.
- Why acceptable: This is product UI composition, not admin-configurable business policy. Future configurable form/content behavior should still come through the forms system, but this slice is about first-class responsive presentation of existing surfaces.

## Testing / Verification Strategy

Automated coverage should focus on realistic mobile behavior, not pixel-perfect snapshots.

Expected commands:

```bash
pnpm --filter=@forge/blade test
pnpm --filter=@forge/blade e2e
pnpm --filter=@forge/blade typecheck
pnpm --filter=@forge/blade lint
pnpm analyze:react:changed
```

Manual/visual checks should include:

- mobile viewport around `390x844`
- smaller mobile viewport around `375x667`
- larger phone viewport around `430x932`
- desktop regression viewport around `1440x900`
- debug latency on `/member/dashboard` and `/member/settings` to inspect skeleton parity

## Open Questions

- Which dashboard disclosures should be open by default on first visit?
- Should mobile form disclosure state persist in local component state only, or in URL/search params for deep linking later?
