# Saicharan Blade Dev Application SRD

Status: Approved

## Technical purpose

Add a self-contained public developer-application route to Blade without changing platform behavior.

## Relevant principles

- [React and Next.js principles](../../../docs/agentic-development/forge-engineering-principles.md#react-and-nextjs-principles)
- [Frontend design-system principles](../../../docs/agentic-development/forge-engineering-principles.md#frontend-design-system-principles)
- [Blade design system](../../../apps/blade/DESIGN_SYSTEM.md)

## Access policy

Public and unauthenticated. No session, role, or permission checks.

## Architecture / data flow

The App Router page renders a Blade-local client gate. Its cinematic component initializes Three.js, loads a Blender-authored `.glb` Tech Knight, normalizes its bounds, prepares its materials at zero opacity, and starts the entrance only after the real model is ready. A 5.4-second timeline first establishes the singularity and energy field, then makes the model visible at 38% and fades its real materials in from 40–60% while it travels along a Catmull–Rom depth path. Shader-driven volumetric light, spatial torus geometry, depth-traveling line particles, dynamic lights, impact shockwaves, and an Unreal bloom pass create the translation effect without a raster placeholder or camera-facing portal texture. Scrolling can complete the entrance and then drives the camera exit.

The final button pushes `#portfolio` into browser history and replaces the application tree with a full-viewport sandboxed iframe. `GET /saicharan-ramineni/site` fetches only the fixed personal-site origin, injects a base URL for remote assets, omits the upstream `X-Frame-Options: DENY` header, and returns cached HTML. Because Cloudflare Rocket Loader rewrites the portfolio's scripts to request-scoped inert MIME types, the bridge restores those scripts to `text/javascript`, removes their loader metadata, and omits the redundant Rocket Loader script. A narrow history guard retries cross-origin `pushState` and `replaceState` calls without a URL, preventing Next.js from resolving the local bridge path against the remote base URL. This lets the original portfolio hydrate and run its Gargantua WebGL renderer unchanged. Hash navigation stays inside the frame; route links open on the personal-site origin. The fixed-source frame grants scripts and same-origin access so its runtime can use the browser APIs it requires. A `popstate` listener restores the application when the visitor navigates Back.

## tRPC/API behavior

None.

## Validation

No user input or runtime data requires validation.

## Data / migration / compatibility

No data, schema, environment, or migration changes. Blade adds `three` and `@types/three`; its Three.js version matches the existing Guild dependency. Checked-in Blender and Node generator scripts make the `.glb` reproducible. Regeneration requires Blender or `BLENDER_BIN`. The personal-site bridge has no user-controlled upstream URL and stores no content or credentials.

## Discord integration

None.

## Configurability review

Would this require a developer change next year?

- Answer: Yes, because this is an intentionally personal, one-off application route owned by the applicant rather than recurring organizational configuration.
- If yes, why is hard-coding acceptable or what admin-configurable path is planned? The route is portfolio content, not operational Blade state.

## React / frontend constraints

Keep `page.tsx` server-side and thin. Confine the WebGL lifecycle to one client boundary, clean up GPU and post-processing resources on unmount, cap pixel density, and keep non-3D content server-rendered. Use semantic landmarks, existing UI primitives, Geist typography, and Knight Hacks assets. Reduced motion starts in the fully arrived state; the page remains useful if WebGL or model loading fails because all identity, application, and navigation content is semantic HTML outside the canvas.

## Testing / verification strategy

Run file formatting, targeted ESLint, Blade typecheck, React analysis for changed files, model regeneration, a production Blade build when environment validation permits, and local route rendering.

## Open questions

- None.
