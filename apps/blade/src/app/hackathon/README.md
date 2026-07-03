# Hackathon participant compatibility routes

Blade is the member and organizer application. It no longer renders participant
applications or dashboards.

The routes in this directory exist only for old bookmarks, email links, and QR
codes:

| Route                        | Behavior                                               |
| ---------------------------- | ------------------------------------------------------ |
| `/hackathon`                 | Redirects to the Blade member dashboard.               |
| `/hackathon/[slug]`          | Redirects to the configured event portal `/dashboard`. |
| `/hacker/application/[slug]` | Redirects to the configured event portal `/apply`.     |

The target origin comes from `Hackathon.portalBaseUrl`. Missing or invalid
origins render an unavailable page and never fall back to participant UI in
Blade.

Organizer workflows remain under `/admin/hackathon/*`.

## Creating a participant portal

Use `@forge/hackathon` for headless workflow state and `@forge/api/participant`
for the restricted tRPC surface. The event app must:

1. Own `/apply`, `/dashboard`, and `/dashboard/profile` visual routes.
2. Mount app-local Better Auth handlers and the participant tRPC router.
3. Pass its validated session into `createTRPCContext`.
4. Keep its brand assets and renderers inside the event app.
5. Set the portal origin and optional confirmation capacity in Blade admin.

See `packages/hackathon/README.md` for the reusable integration contract.
