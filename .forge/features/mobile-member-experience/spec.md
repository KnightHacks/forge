# Mobile Member Experience Spec

Status: Complete

> This file owns the non-technical user/product intent. Technical constraints belong in `srd.md`.

## User-facing Purpose

The member experience in Blade should feel first-class on mobile, not like a desktop dashboard that was stacked into a narrow viewport.

This feature should improve the existing member flow:

```txt
landing/sign-in -> member signup -> member dashboard -> member settings
```

The goal is density, clarity, and touch ergonomics. Mobile should show useful information sooner, reduce oversized spacing, keep actions easy to reach, and preserve the dashboard/settings page transition that already feels good.

## Users / Actors

- Public visitor reaching the member entry/sign-in flow on a phone.
- Signed-in Discord user completing member signup on a phone.
- Signed-in member viewing their dashboard on a phone.
- Signed-in member editing their profile on a phone.
- Desktop member users, because shared layout changes should not make desktop worse.

## User-visible Interface

### Mobile Dashboard

- The dashboard should prioritize Guild/social profile information first on mobile.
- Guild profile content should feel closer to a compact social profile than a desktop account card.
- The settings cog should move into the Guild/profile area on both desktop and mobile so profile editing is attached to the profile object itself.
- Mobile should stay lightweight: profile picture, tagline, company, profile links, and resume should be the visible quick actions.
- When mobile dashboard content is limited to the Guild/profile surface, that card should fill the available screen height and use nested inset cards for company, links, and resume instead of loose floating text.
- Heavier member/account details should not be stacked onto the mobile dashboard just because they exist on desktop.
- Desktop dashboard details should not be hidden inside disclosure sections.
- Resume and profile-picture controls should stay easy to find without consuming too much vertical space.
- Natural scroll is acceptable, but the first screen should carry meaningful profile information instead of oversized framing.

### Mobile Signup And Settings Forms

- Signup and settings should share the same mobile structure and visual rhythm.
- Forms should use compact, readable sections rather than large desktop-sized blocks.
- Personal, Academics, and Guild sections should remain easy to scan.
- Section content may be compacted when that helps show more information at once, but normal desktop form/dashboard content should not be hidden in disclosure sections without a clear reason.
- Update/edit flows should use a sticky bottom action area on mobile for the primary save action.
- Signup/create should keep the create action at the bottom of the form so new users do not assume they can submit before reviewing every section.
- Dirty state and reset behavior should remain understandable on mobile.

### Mobile Dialogs

- Dialogs should fit phone screens with safe edge padding.
- Resume viewing, upload states, delete confirmation, and dirty-changes confirmation should not feel like desktop modals squeezed onto a phone.
- Destructive actions should remain explicit and hard to trigger accidentally.

### Skeleton And Loading States

- Skeletons should match the loaded layout closely on mobile and desktop.
- Loading should not cause major card position or height shifts when real content appears.
- The dashboard/settings page transition should continue to feel smooth with loading states.

### Motion

- Keep the dashboard/settings page-to-page transition.
- Motion should be subtle and route-level, not a second animation layered on every card after skeleton replacement.
- Respect reduced-motion preferences.

## Scope

### In Scope

- Mobile-first layout pass for `/member/dashboard`.
- Mobile-first layout pass for `/member/settings`.
- Mobile-first layout pass for `/form/member-signup`.
- Mobile dialog treatment for resume viewer, upload-related dialogs/states, dirty-changes confirmation, and profile deletion confirmation.
- Move dashboard settings cog into the Guild/profile area on both desktop and mobile.
- Mobile dashboard compaction that removes low-priority member/account details from the first mobile dashboard surface.
- Desktop dashboard member details should remain visible in normal panels rather than disclosure sections.
- Sticky bottom save action on mobile settings.
- Bottom-of-form create action on mobile signup.
- Skeleton updates so loading states match the final mobile layout.
- Design-system guidance for mobile density, Guild-first dashboard layout, nested surfaces, sticky actions, and skeleton parity.
- Playwright coverage at realistic mobile viewport sizes.

### Out Of Scope

- New member data fields.
- New database tables or migrations.
- Changing Discord auth behavior.
- Changing resume or profile-picture storage architecture.
- Public Guild directory implementation.
- Admin member management.
- Full app-wide mobile redesign outside the member flow.

## Vocabulary

- `Mobile-first`: The mobile layout is intentionally designed for phone use before desktop fallback is considered.
- `Guild profile`: The social-facing subset of member profile data shown prominently on the dashboard.
- `Disclosure`: A compact expand/collapse pattern for content that should remain accessible without always occupying screen space.
- `Sticky action`: A bottom action area that keeps submit/save reachable while scrolling a form on mobile.
- `Skeleton parity`: Loading skeletons match the loaded layout's structure, spacing, and approximate height.

## Acceptance Criteria

- `/member/dashboard` presents Guild/social profile information first on mobile.
- The settings cog is attached to the Guild/profile area on both desktop and mobile.
- Mobile dashboard content is denser and avoids oversized desktop spacing.
- Mobile dashboard limits the first surface to the Guild/social profile, profile links, company/tagline context, and resume action.
- Mobile dashboard uses a screen-height Guild/profile card when it is the only visible mobile dashboard card.
- Desktop dashboard member details remain visible without disclosure controls.
- `/member/settings` uses a sticky bottom save action on mobile.
- `/form/member-signup` keeps the create action at the bottom of the form.
- Signup and settings forms feel visually related and use comparable mobile spacing.
- Mobile form sections remain easy to scan and complete with touch input.
- Dirty-changes confirmation works cleanly on mobile.
- Resume viewing and profile deletion dialogs fit phone screens without clipping.
- Skeletons closely match the loaded dashboard and settings layouts.
- Page transitions between dashboard and settings remain present and smooth.
- Desktop remains visually consistent with the existing Blade design system.

## Open Questions

- None. The final mobile dashboard uses one focused Guild/profile surface rather
  than disclosure sections.
