# Stevin Dev Team Application SRD

Status: Active local review

## Scope and architecture

The public `/stevin-george` route lives only in `apps/blade`. The server page owns metadata and typography; the client scene owns dropdown state and Lenny's interaction. Scoped CSS preserves the peach application style. No authentication, tRPC, database, configuration, or shared package changes are needed.

## Preview assets

`portfolio-preview.jpg` is a viewport screenshot of `https://stevin.dev` captured for this batch. `stevin-george-resume.pdf` is the exact PDF Stevin supplied as `Stevin_George_Resume-2.pdf`, and `stevin-george-resume-preview.jpg` is a render of its single page. These are local static assets. The Resume preview opens this exact local PDF in a new tab; the Portfolio preview opens the full external site. Refresh the screenshots when their sources change; the page does not fetch screenshots at runtime.

## Interaction

The two upper headings are buttons with exclusive `aria-expanded` panels. Hidden panels are inert and hidden from assistive technology. The lower headings contain ordinary external anchors. The existing desktop game uses the original Lenny sprite sheet and reads the rendered heading bounds for its four landing platforms. Resume and Portfolio landings open their panels; GitHub and LinkedIn landings update the visual state and hint. Enter on a social landing opens its link, while landing itself never opens a tab. Direct links continue to work independently of the game.

The desktop scene stays 640px tall. An open Resume or Portfolio panel expands the first grid row to fit its roughly 300px preview card and moves only the lower links; the tree, resting Lenny, and grass keep fixed coordinates. The tree displays at 420×525px, with its lower roots covered by the grass; the resting Lenny displays at 150×227px. The playable sprite displays at 168×217px, with matching collision and atlas-cell dimensions. Lenny's platform bounds are refreshed during the row transition so he remains on a moving heading. The tree and Lenny are hidden at tablet and mobile widths. The mobile layout stacks all four rows and shows the full resume page inside its preview. Existing reduced-motion behavior applies to the new transitions.

## Verification

Check the 1440px desktop home and both open states, 390px and 320px mobile states, keyboard dropdowns and links, social and upper Lenny landings, Escape, reduced motion, asset loading, no horizontal overflow, Blade typecheck, targeted lint and format, React change analysis, and `git diff --check`.
