# Mobile Member Experience Test Cases

Status: Complete

> This file owns observable proof for this feature slice.

## Scope

These cases cover the mobile member experience across signup, dashboard, settings, dialogs, skeletons, and route transitions.

The cases intentionally exclude database migrations, auth behavior changes, public Guild directory behavior, admin member management, and new upload storage behavior.

## Test Placement Plan

- Blade component tests: `apps/blade/src/tests/member/**`.
- Blade Playwright tests: `apps/blade/src/tests/e2e/mobile-member-experience.spec.ts`.
- Existing API/validator tests should continue to run, but this feature should not require new API or validator test files unless implementation changes those packages.

Candidate commands:

```bash
pnpm --filter=@forge/blade test
pnpm --filter=@forge/blade e2e
pnpm --filter=@forge/blade typecheck
pnpm --filter=@forge/blade lint
pnpm analyze:react:changed
```

## Test Cases

### TC-001: Mobile Dashboard Is Lightweight Guild Profile

Setup:

- A valid mobile e2e session exists.
- The user has a member profile with Guild fields, profile picture, links, resume, and about text.
- Viewport is `390x844`.

Action:

- Visit `/member/dashboard`.

Expected observations:

- Guild/social profile content is the mobile dashboard surface.
- Lower-priority member/account details are not stacked below the Guild profile on mobile.
- The settings cog is visible inside the Guild/profile area.
- Avatar, name, tagline/company, profile links, and resume actions are visible or reachable without awkward horizontal overflow.
- The Guild/profile card fills most of the phone viewport when it is the only visible dashboard card.
- Company is rendered as an inset card, matching the link/resume surface treatment.
- Resume actions are compact and not duplicated as competing dashboard cards.

### TC-002: Desktop Dashboard Still Matches The Member Layout

Setup:

- A valid member session exists.
- Viewport is desktop-sized.

Action:

- Visit `/member/dashboard`.

Expected observations:

- The dashboard still uses the Blade top-level card and nested surface hierarchy.
- The settings cog remains attached to the Guild/profile area.
- Desktop layout does not regress into a mobile-only stack.
- Desktop member details are visible in panels, not drawers/disclosures.

### TC-003: Mobile Signup Uses Bottom Submit

Setup:

- A signed-in user without a member profile reaches `/form/member-signup`.
- Viewport is `390x844`.

Action:

- Scroll through the signup form.

Expected observations:

- The primary submit action appears at the bottom of the form, after all sections.
- The submit action is not sticky at the top of the signup experience.
- Personal, Academics, and Guild sections are compact and readable.
- Profile picture and resume controls use the same visual treatment as the update flow.

### TC-004: Mobile Settings Uses Sticky Save And Dirty State

Setup:

- A valid member session exists.
- Viewport is `390x844`.

Action:

- Visit `/member/settings`.
- Change a non-upload profile field.

Expected observations:

- The save/update action becomes available in a sticky bottom area.
- Reset/undo remains available without crowding the primary save action.
- Dirty state is clear.
- Saving remains on `/member/settings`.

### TC-005: Compact Disclosures Preserve Access

Setup:

- A valid member session exists on mobile.
- Dashboard/settings content includes long about text and multiple secondary fields.

Action:

- Open and close compact dashboard/form disclosure sections.

Expected observations:

- Lower-priority content is reachable.
- Collapsed state saves vertical space.
- Open state does not cause text overflow or layout overlap.
- Keyboard and screen-reader semantics come from accessible UI primitives.

### TC-006: Mobile Dialogs Fit The Screen

Setup:

- A valid member session exists on mobile.

Action:

- Open the resume viewer dialog.
- Trigger dirty-changes confirmation.
- Trigger profile deletion confirmation.

Expected observations:

- Each dialog opens centered or in the intended mobile-safe placement.
- Dialog content fits within the viewport with safe edge padding.
- Primary, secondary, close, and destructive actions remain reachable.
- Resume preview controls do not clip off-screen.

### TC-007: Skeletons Match Loaded Mobile Layout

Setup:

- A valid member session exists.
- Viewport is mobile-sized.
- Debug latency is enabled on dashboard/settings if needed.

Action:

- Visit `/member/dashboard?debugLatency=3000`.
- Visit `/member/settings?debugLatency=3000`.

Expected observations:

- Skeleton containers match the final card positions, width, and approximate height.
- Loaded content replaces skeleton content without large layout jumps.
- Route transition does not animate cards into an empty skeleton gap.

### TC-008: Dashboard Settings Transition Works On Mobile

Setup:

- A valid member session exists.
- Viewport is `390x844`.

Action:

- Tap the Guild/profile settings cog.
- Navigate back to dashboard from settings.

Expected observations:

- Page-to-page transition is visible and smooth.
- The transition does not fight sticky actions, skeletons, or dialog states.
- Reduced-motion behavior remains safe if the browser requests reduced motion.

## Negative / Regression Cases

### TC-NEG-001: Mobile Layout Does Not Hide Required Signup Errors

Setup:

- A signed-in user without a member profile is on mobile signup.

Action:

- Submit with required fields missing.

Expected observations:

- Required errors appear near the affected fields.
- The bottom submit area does not cover the error text.
- The user can reach and fix every invalid field.

### TC-NEG-002: Long Guild About Text Does Not Overflow

Setup:

- A member has a long Guild about value.
- Viewport is mobile-sized.

Action:

- Visit `/member/dashboard`.
- Expand the about/disclosure area if applicable.

Expected observations:

- Text wraps, clamps, or scrolls according to the designed state.
- Text does not escape its card or overlap company/visibility/link content.

### TC-NEG-003: Upload Controls Do Not Shift Card Height Unexpectedly

Setup:

- A valid member session exists on mobile.

Action:

- Replace profile picture.
- Replace resume.

Expected observations:

- Loading state stays inside the relevant control.
- Parent card height does not jump in a distracting way.
- The user can still access the sticky settings save area if the form has unsaved text changes.

## Open Questions

- None. Playwright validates the final primary-information surface; the shipped
  mobile dashboard does not use disclosure sections.
