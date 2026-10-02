# Saicharan Blade Portfolio Test Cases

Status: Approved

## Scope

Validate the public application route, real-time 3D departure, singularity-to-portfolio reveal, sandboxed personal-site frame, responsive layout, loading behavior, and reduced-motion behavior. Authentication and backend behavior are excluded.

## Test placement plan

Blade route and component checks through Prettier, ESLint, TypeScript, React analysis, model regeneration, and local HTTP rendering.

## Test cases

### TC-001: Portfolio identity and navigation

Setup:

- Blade is running locally.

Action:

- Visit `/saicharan-ramineni` and follow the primary links.

Expected observations:

- Saicharan's name, Blade application identity, résumé, and intro-skip action are visible and usable without duplicated portfolio detail.

### TC-002: Responsive presentation

Setup:

- Render the page at desktop and 320px mobile widths.

Action:

- Inspect the full page and primary navigation.

Expected observations:

- Content wraps without document-level horizontal overflow, touch targets remain usable, and key content is not clipped.

### TC-003: Automatic 3D departure

Setup:

- Load the route in a WebGL-capable browser.

Action:

- Load the opening cinematic and allow its timeline to complete without interacting.

Expected observations:

- The live Tech Knight GLB is the opening focal point at full scale.
- A black hole forms behind the model with a black event horizon, luminous accretion structure, warped particles, and responsive scene lighting.
- Tech Knight accelerates backward into the core, with controlled rotation, stretching, scale loss, and material fade that remain spatially aligned with the singularity.
- No PNG, canvas texture, or other model placeholder is displayed.

### TC-004: Singularity portfolio reveal

Setup:

- Load the route with a working personal-site bridge.

Action:

- Allow the departure to reach the event horizon.

Expected observations:

- The personal site reveals from the black-hole core rather than appearing as an unrelated page replacement.
- The reveal expands to the full viewport without a flash, blank frame, or visible iframe edge.
- The Three.js layer disappears only after the portfolio is established.

### TC-005: Personal-site bridge

Setup:

- Reach the completed singularity reveal.

Action:

- Inspect and interact with the revealed personal site.

Expected observations:

- The Blade cinematic yields to a full-viewport frame of the personal website.
- The frame loads through the fixed local bridge despite the upstream site's direct-frame denial.
- Cloudflare's transformed script types and Rocket Loader wrapper are absent from the bridged response, while the original portfolio scripts remain executable.
- The portfolio reaches `cosmos-ready`; its genuine Gargantua canvas is visible and sized above the default 300×150 canvas dimensions.
- The remote-base history guard prevents cross-origin `pushState` and `replaceState` crashes during hydration.
- Hash links remain in-frame; route and external links open outside it.
- The fixed-source frame is sandboxed with the script and same-origin capabilities required by the original renderer.

### TC-006: Skip control

Setup:

- Load the route while the cinematic is running.

Action:

- Select “Skip intro”.

Expected observations:

- The portfolio is revealed immediately and the visitor is not trapped behind the WebGL sequence.

## Negative / regression cases

### TC-NEG-001: Reduced motion

Setup:

- The visitor enables reduced motion.

Action:

- Load and navigate the portfolio.

Expected observations:

- Tech Knight is shown in a static full-scale composition, decorative motion does not autoplay, and an explicit action reveals the portfolio.

### TC-NEG-002: Model or WebGL unavailable

Setup:

- Prevent the `.glb` from loading or use a browser without WebGL.

Action:

- Load the portfolio.

Expected observations:

- The already-loading personal-site frame is revealed, no misleading raster model substitute appears, and the visitor does not remain on a broken cinematic surface.

## Open questions

- None.
