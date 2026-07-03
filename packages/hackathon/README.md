# `@forge/hackathon`

Headless participant workflows for Forge hackathon applications. This package
owns typed participant API state and lifecycle operations; event applications
own their markup, assets, animation, and branding.

The client provider talks only to the same-origin `@forge/api/participant`
router. Its hooks expose typed query/mutation state without importing the full
Blade/admin API:

- `useHackerApplicationFlow({ hackathonStartDate })` owns the browser schema,
  resume validation/upload, prior-hacker/member prefill, duplicate state,
  consent, submission, and step/navigation state.
- `useHackerDashboardFlow()` owns participant lifecycle refresh, confirmation,
  withdrawal, QR retrieval, schedule data, past attendance, and issue reports.
- `useHackerProfileFlow()` owns hackathon-scoped profile and resume updates.

`getHackerLifecycleState` is a pure helper for rendering application and
attendance states. Visual components, class names, assets, and copy remain in
the event app.

## Starting a new portal

1. Create a Next.js event app with an app-local `HackathonPortalConfig`.
2. Instantiate `createForgeAuthServer` with the event app origin and mount its
   Better Auth handlers at `/api/auth`.
3. Mount `participantRouter` at the app's same-origin `/api/trpc` route and pass
   the app-local validated session to `createTRPCContext`.
4. Wrap participant routes in `HackathonPortalProvider`.
5. Pass the event start date to the application flow and build event-specific
   application, dashboard, and profile renderers around the three headless
   workflow hooks.
6. Set the hackathon's portal base URL in Blade admin.

For KH9, copy only this wiring and an app-local config. Do not copy Bloom's
markup or move its styling into this package; the renderer should be entirely
KH9-owned.

## Bloom rollout

Before enabling Blade redirects:

1. Set `BLOOMKNIGHTS_URL` to the exact Bloom origin.
2. Register Discord callbacks for
   `https://bloom.knighthacks.org/api/auth/callback/discord` and
   `http://localhost:3006/api/auth/callback/discord`.
3. Apply the Hackathon portal/capacity migration.
4. Deploy and smoke-test Bloom auth, application, dashboard, and profile.
5. Deploy Blade only after the Bloom portal is healthy.

Do not add event-specific visuals to this package or to `@forge/ui`.
