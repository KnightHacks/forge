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

The App Router page renders a Blade-local client gate. Its cinematic component initializes Three.js, loads and normalizes the Blender-authored `.glb` Tech Knight, and begins with the real model fully visible at a viewport-filling scale. A time-based sequence holds that hero composition, forms a shader-driven accretion disc and event horizon behind the model, bends stars and particle trails toward the core, then moves, stretches, rotates, dims, and shrinks the live GLB into the singularity. Dynamic rim lights, spatial rings, lensing geometry, a terminal energy flash, and Unreal bloom support the departure without a raster placeholder.

The full-viewport sandboxed iframe begins loading behind the cinematic layer. Once the model reaches the event horizon and the iframe is ready, the gate expands a circular clip from the singularity's screen position until the personal site occupies the viewport; the Three.js layer fades only after the reveal is established. `GET /saicharan-ramineni/site` fetches only the fixed personal-site origin, injects a base URL for remote assets, omits the upstream `X-Frame-Options: DENY` header, and returns cached HTML. Because Cloudflare Rocket Loader rewrites the portfolio's scripts to request-scoped inert MIME types, the bridge restores those scripts to `text/javascript`, removes their loader metadata, and omits the redundant Rocket Loader script. A narrow history guard retries cross-origin `pushState` and `replaceState` calls without a URL, preventing Next.js from resolving the local bridge path against the remote base URL. This lets the original portfolio hydrate and run its Gargantua WebGL renderer unchanged. Hash navigation stays inside the frame; route links open on the personal-site origin. The fixed-source frame grants scripts and same-origin access so its runtime can use the browser APIs it requires.

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

Keep `page.tsx` server-side and thin. Confine the WebGL lifecycle to one client boundary, clean up GPU and post-processing resources on unmount, cap pixel density, and keep identity and navigation semantic outside the canvas. Keep React state changes phase-based rather than frame-based; Three.js owns per-frame transforms while the gate owns the one-time portfolio reveal. The timeline may pause at the reveal threshold until the iframe reports ready. A visible skip control bypasses the cinematic. Reduced motion uses a static Tech Knight composition and an explicit portfolio action rather than automatic spatial movement. If WebGL or model loading fails, reveal the already-loaded portfolio instead of leaving a blank scene.

## Testing / verification strategy

Run file formatting, targeted ESLint, Blade typecheck, React analysis for changed files, model regeneration, a production Blade build when environment validation permits, and local route rendering.

## Open questions

- None.
