# Navigation regression cases

1. At 1440px, click Dashboard, Lore, Teams, Events, Merch Store, My Hack, 3D Printing, and Profile. The same navigation DOM remains mounted; account, support, return, and logout controls remain present. Exactly the current tab is selected.
2. Enable judging in a browser-local fixture. Navigate to Judging and back; the same sidebar and controls remain mounted. The default locked judging state stays disabled.
3. At 320px, open the drawer and navigate through every available tab. Drawer closes, body scrolling is restored, and the document has no horizontal overflow. Repeat at a short viewport height; scroll to reach all tabs without overlapping the footer.
4. Open the drawer, resize above 700px, and return to mobile. Body scrolling is restored and the drawer stays closed.
5. Open the drawer and press Escape; reopen and use browser Back. Both close the drawer and keep navigation available. Check the header after scrolling a long page.
6. Scroll desktop content and sidebar, then switch tabs. Content starts at the top; sidebar DOM and its scroll position survive.
7. Open Report issue from a previously missing tab, type a draft, close, change tabs, and reopen. Draft persists. Do not send a report during verification.
8. Test loading and query-error states with browser-local interception and the temporary sample-data proxy. Navigation remains available. Check an unknown dashboard route and the profile typo redirect.
9. Run app typecheck, lint, unit tests, formatting, and changed React analysis. Inspect desktop and 320px screenshots.

10. Open Hacker’s Guide from desktop and mobile navigation. The Notion page appears inside the shared shell, the guide tab is selected, and the iframe fits without horizontal document overflow. Dashboard links no longer includes a guide card. Existing guide status CTA routes to /dashboard/guide.

11. Compare computed backgrounds across Guide, Lore, Teams, Events, Judging, Merch Store, My Hack, Printing, and Profile: all use the same purple/blue/green gradient and hide scenery/effects. Report issue uses the same gradient. Dashboard still displays its original scenery. Check desktop and 320px screenshots.

12. Verify textured backgrounds and decorative edge artwork at 1440px, 768px, 390px and 320px. Check all dashboard routes for horizontal overflow and preserved controls. Grain/artwork must remain below text and controls, have pointer-events disabled, and add no accessible or focusable content. Confirm assets load, original Dashboard scene persists, and Report issue retains readable fields.

Botanical border regression: inspect Events at desktop and 320px, Printing at desktop and 390px including its page end, and the Profile form footer. Vines must touch the top boundary; foliage roots must exit the lower boundary; no floating flowers or fragments; no decorative overlap with controls. Reset browser viewport overrides after testing.

Landscape scale: on desktop and 320/390px mobile, confirm trees span the viewport instead of shrinking into ornaments. On Lore, scroll multiple screens and confirm the large tree remains behind content, its root exits the lower boundary, and text stays readable. Foreground plants must remain smaller than the tree. Check both the branching tree and forest-trunk variants.

Vector-quality regression: parse every botanical SVG, reject embedded images/scripts, and ensure every url(#id) points to an existing local definition. Inspect the vines at rendered desktop size and scenery trees above 100vh; edges must remain smooth. Confirm tree cut ends bleed past the page boundary on short pages and meet the scrollbar edge on long pages.
