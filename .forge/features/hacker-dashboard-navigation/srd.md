# Technical requirements

- Own KhixDashboardShell in dashboard/layout.tsx, above individual routes. All dashboard pages and their pending/error/not-found content render inside that shell.
- Derive tab selection from the pathname; expose aria-current only on the matching tab.
- Read the account from the existing session query in the shell. Own the support dialog in one shared navigation action, using the existing support behavior extracted into usePortalIssueReport.
- Keep existing query gates for confirmation, check-in, and judging availability.
- Preserve sidebar DOM/scroll across tab changes. Reset the content scroll and focus the content region when the pathname changes.
- Close the mobile drawer on tab clicks and browser history navigation; reset drawer state at the existing 701px desktop breakpoint. Release the body scroll lock through effect cleanup.
- Bound the mobile tab list to its grid row so it cannot overlap the account/footer controls.
- No new dependencies, migrations, configuration, external writes, or commits.

The guide is a server-rendered dashboard route containing a titled iframe with the user-supplied Notion embed URL. Its responsive styles live in the existing dashboard CSS module. The sidebar adds an unrestricted guide link. Remove ToolDock's guide prop/tile and point the contextual StatusAction guide CTA at the internal route; leave shared SDK/config contracts unchanged.

Use three unmodified Illustrator exports (Asset 29 flower, Asset 32 leaves, Asset 51 vine) in apps/2026/public/dashboard/botanicals, with a small static SVG noise tile. Render one aria-hidden decorative layer in the shared shell. CSS backgrounds reuse the assets without image layout shifts or JavaScript animation. The shared gradient token includes grain for both pages and portalled dialogs; the scene-backed Dashboard uses a separate grain layer. Mobile hides the flower and scales edge foliage down.

Responsive artwork refinement: add a second vine on wide screens; size the primary vine at 7–10rem wide with original 93:289 aspect ratio. Explicit negative top offsets provide the requested bleed. At <=1100px, hide the companion and use one 5rem vine, preserve content width, and reserve 15rem below the content for larger leaves and flower. These CSS-only decorations remain aria-hidden and pointer-inert.

ToolDock now accepts only resume props and renders only the Resume tile in both no-participant and participant branches. Removed application link constants, application dialogs/copy helper, obsolete QR/support/application props, and multi-column dock variants. The loading skeleton matches the single remaining tile.

The shared decorative layer uses data-page from the existing active tab, with route-specific CSS variables and placement. Added long vine, fan leaf, two tree silhouettes, and purple mushroom cap/stem exports. Tree silhouettes are upright at the bottom with foliage covering their cut bases; the mushroom uses layered cap/stem backgrounds and a foreground plant. No glow/bead assets are shipped. Mobile uses a single top vine, content clearance, and a smaller ground scene.

Botanical border revision: the existing aria-hidden, pointer-inert artwork spans render layered foliage using CSS pseudo-elements. Route-specific custom properties control canopy rhythm and foliage scale. Bottom content clearance is 11rem desktop and 9rem below 1100px; the secondary vine is hidden below 1100px. No changes to routing, data, or interactions.

Landscape layer: a sticky pseudo-element inside the non-dashboard botanical wrapper renders a route-specific tree plus a broad rock face behind content. The wrapper uses overflow: clip so the scene follows the main scrolling container. Desktop trees render at 140–180% of viewport height; mobile uses 145% with lower opacity and deliberate edge bleed. Foreground plants remain separately scaled.

Vector asset contract: the web SVGs use recovered native geometry and gradients, with original export bounds preserved through a wrapper translation. Do not reintroduce embedded image elements or bitmap-backed appearance effects. The non-dashboard main scroller uses an automatic scrollbar gutter so clipped scenery reaches the visible page edge.
