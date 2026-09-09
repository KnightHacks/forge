# Saicharan Blade Portfolio Test Cases

Status: Approved

## Scope

Validate the public application route, real-time 3D entrance, minimal handoff, sandboxed personal-site frame, responsive layout, loading behavior, and reduced-motion behavior. Authentication and backend behavior are excluded.

## Test placement plan

Blade route and component checks through Prettier, ESLint, TypeScript, React analysis, model regeneration, and local HTTP rendering.

## Test cases

### TC-001: Portfolio identity and navigation

Setup:

- Blade is running locally.

Action:

- Visit `/saicharan-ramineni` and follow the primary links.

Expected observations:

- Saicharan's name, Blade application identity, résumé, and final personal-site action are visible and usable without duplicated portfolio detail.

### TC-002: Responsive presentation

Setup:

- Render the page at desktop and 320px mobile widths.

Action:

- Inspect the full page and primary navigation.

Expected observations:

- Content wraps without document-level horizontal overflow, touch targets remain usable, and key content is not clipped.

### TC-003: Automatic 3D entrance

Setup:

- Load the route in a WebGL-capable browser.

Action:

- Load the opening cinematic and allow its timeline to complete.

Expected observations:

- A distant singularity and energy field build while the Tech Knight remains invisible. The live GLB then materializes and travels toward the camera through volumetric light and depth streaks before impact waves resolve around the settled pose.
- The title and navigation reveal only after the arrival becomes readable.
- No PNG, canvas texture, or other model placeholder is displayed.

### TC-004: Entrance skip and scroll handoff

Setup:

- Load the route in a WebGL-capable browser.

Action:

- Scroll before the automatic entrance finishes, then continue through the hero.

Expected observations:

- The entrance completes immediately without trapping the visitor.
- Further scrolling moves the settled model and camera into the application content without a blank frame.

### TC-005: Personal-site handoff

Setup:

- Reach the final action.

Action:

- Select “Enter saicharanramineni.com”, then use browser Back.

Expected observations:

- The Blade page is replaced by a full-viewport frame of the personal website.
- The frame loads through the fixed local bridge despite the upstream site's direct-frame denial.
- Cloudflare's transformed script types and Rocket Loader wrapper are absent from the bridged response, while the original portfolio scripts remain executable.
- The portfolio reaches `cosmos-ready`; its genuine Gargantua canvas is visible and sized above the default 300×150 canvas dimensions.
- The remote-base history guard prevents cross-origin `pushState` and `replaceState` crashes during hydration.
- Hash links remain in-frame; route and external links open outside it.
- The fixed-source frame is sandboxed with the script and same-origin capabilities required by the original renderer.
- Browser Back restores the Blade application.

## Negative / regression cases

### TC-NEG-001: Reduced motion

Setup:

- The visitor enables reduced motion.

Action:

- Load and navigate the portfolio.

Expected observations:

- The Tech Knight starts in its fully arrived state, decorative animations stop, and all content and links remain visible.

### TC-NEG-002: Model or WebGL unavailable

Setup:

- Prevent the `.glb` from loading or use a browser without WebGL.

Action:

- Load the portfolio.

Expected observations:

- The semantic identity, navigation, application, work evidence, résumé, and contact links remain visible; no misleading raster model substitute appears.

## Open questions

- None.
