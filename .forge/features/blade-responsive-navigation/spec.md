# Blade responsive navigation

Status: Implemented and validated.

## Purpose and scope

Members, officers and judges should see a response as soon as they navigate or select a view. Reuse Blade's violet accents, raised panels and existing page skeletons. Cover Blade routes and button-driven navigation; other websites are excluded.

## Acceptance criteria

- Links start navigation immediately, without a decorative delay.
- Pending navigation shows a subtle progress indicator and the intended rail destination immediately.
- Layout and page waits have responsive skeletons; existing content stays usable during in-page updates.
- Tabs and selectors acknowledge the chosen view immediately where the data is already available or can be safely represented as pending.
- Feedback clears after completion, interruption or error. Rapid navigation remains usable.
- Keyboard, modified clicks, downloads, scroll/history options, unsaved-settings guards and reduced motion retain their behavior.
- Saves keep their existing pending, success and error semantics. Do not invent successful results before confirmation.

## Decisions and open questions

The user prioritized navigation across Blade and authorized implementation and browser testing. No blocking product questions: use existing design and access contracts. Database, authentication, permissions, payments, uploads, email delivery and other websites are outside this change.
