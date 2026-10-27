# Stevin Dev Team Application Status

Current phase: Lenny interaction review. The earlier forest portfolio's Lenny controller reads one local sprite sheet, and the playable character has been enlarged; Stevin can review the interaction before any further Git or application submission steps.

## Goal

Create a public, one-page Dev Team application at Blade's `/stevin-george` route. Preserve the approved Figma direction: peach background, centered name and short introduction, Resume on the left, Portfolio on the right, a tree between them, original Lenny peeking from the grass, and a simpler mobile view. Stop before any further commit, push, pull request, or application submission.

## Reviewable batches

Each batch ends with a local preview and a pause for Stevin to edit the design or content before the next batch.

1. **Static page:** Build the public route and responsive layout. Match the Figma home views with the original tree, grass, and Lenny assets. Show the two closed dropdown headings. On mobile, omit the tree and Lenny as approved.
2. **Content and links:** Make Resume and Portfolio accessible dropdowns. Add the resume PDF link, a featured project screenshot with a short accurate description and project link, plus compact links to the full portfolio, GitHub, and LinkedIn inside the Portfolio dropdown. Add no contacts section. Use the current published resume and verified portfolio project as editable content.
3. **Page motion:** Animate the first entrance, the handwritten Lenny prompt, dropdown transitions, chevrons, project reveal, and hover/focus feedback. Keep content available while animation runs and support reduced motion.
4. **Playable Lenny:** Clicking the original Lenny activates desktop keyboard movement and jumping. Tree branches and the Resume/Portfolio lines act as platforms; landing on a section opens its dropdown. Keep the direct dropdown controls independent of the game.
5. **Review and PR preparation:** Compare desktop and 320px mobile screenshots with Figma; check keyboard use, links, reduced motion, asset sizing, and relevant Forge commands. Prepare a review summary only. Do not commit, push, open a PR, or submit the Blade application without a later instruction.

## Decisions already made

- 2026-10-26: Forked `KnightHacks/forge` to `StevScripts/forge`, cloned it locally, and created branch `stevin/dev-team-application`.
- 2026-10-26: Opened the Forge checkout in VS Code. The application is scoped to `apps/blade`; no other app or shared package changes are planned.
- 2026-10-26: Exported the original tree, Lenny, grass, chevron, and handwritten pointer assets from the approved Figma file into `apps/blade/public/dev-team/stevin-george/`.
- 2026-10-26: Batch 1 added the public `/stevin-george` page, desktop/mobile layout, page metadata, and scoped styles. The exported original Figma artwork is in use. At this point no commit, push, PR, or application submission had been made.
- 2026-10-26: Batch 2 added semantic Resume and Portfolio buttons with an exclusive open state, keyboard access, focus styles, and accurate links. Portfolio features greghouse, using the screenshot and contribution details from Stevin's existing portfolio. The published resume PDF is linked directly. The simpler stacked layout now covers tablet widths to keep the project readable and clear of the tree. No contacts section was added.
- 2026-10-26: Batch 3 added a staged page entrance, tree and Lenny entrance, restrained Lenny/pointer idle movement, dropdown expansion and collapse, chevron rotation, project reveal, and hover/press feedback. Closed panels remain in the DOM but are inert and hidden from assistive technology. Reduced-motion users receive the final state without timed effects.
- 2026-10-26: Batch 4 made the original Lenny art a desktop-only playable character. Clicking him starts a hop; arrow keys or A/D move, Space/Up jumps, clicking again jumps, and Escape exits. Branch-shaped landing zones lead to the Resume and Portfolio lines; landing on either line opens its dropdown. The direct dropdown buttons remain available throughout play. The asset pixels were not edited.
- 2026-10-26: Batch 5 compared the live page with Figma desktop and mobile views, aligned the active chevrons and Resume PDF arrow, enlarged mobile link tap targets, and stopped mobile from fetching the hidden tree and Lenny images. Branch HEAD is `03b5b250 DevAppLayout`, which was already present when this review began. No commit, push, PR, or submission was made during Batch 5.
- 2026-10-26: Follow-up replaced the custom Lenny motion with the earlier forest portfolio's `walk.ts` movement and 16 original Knight Hacks walk frames from `/Users/stevin/Documents/ChatGPT/KH Forge/forge/apps/blade`. The movement equations and distance-based frame timing are preserved; player dimensions and platform geometry fit the current one-page scene. The original Figma `lenny.png` remains the resting peek. No commit, push, PR, or submission was made during this follow-up.
- 2026-10-26: Sprite-sheet follow-up packed those same 16 frames in reading order into one 4×4 transparent WebP atlas at `lenny-walk-sheet.webp`. Each cell is 246×318 source pixels and displays at 82×106 CSS pixels. The atlas uses WebP quality 90 and full alpha quality; the 16 redundant route-local frame files were removed. The original Figma resting image and the earlier movement equations remain. Branch HEAD was `4b21997c InitialControllerSetup` when this follow-up began; no new commit, push, PR, or submission was made in this turn.
- 2026-10-26: Enlarged playable Lenny from 82×106 to 112×145 CSS pixels, keeping the same sprite-sheet art and movement controller. Removed the red focus rectangle around Lenny and kept a small green marker for keyboard focus. The resting Lenny image is unchanged. No new commit, push, PR, or submission was made in this turn.

## Content to review

- Resume: currently linked to `https://stevin.dev/Stevins_s_Resume.pdf`; Stevin can replace it with a newer version.
- Featured project: currently `greghouse`, with its existing portfolio screenshot and Devpost link. Stevin can choose another project or supply a different screenshot.
- Profile links: `https://stevin.dev`, `https://github.com/StevScripts`, and `https://www.linkedin.com/in/georgestevin/`.

## Validation / commands

- Figma design context read for desktop home, desktop open states, and 390px/320px mobile views.
- Forge docs and Blade design system read before page work.
- Blade TypeScript check passed: `fnm exec --using=24.22.1 corepack pnpm --filter=@forge/blade typecheck`.
- Targeted ESLint and Prettier checks passed for the Batch 1 page and styles.
- Local previews returned HTTP 200 at 1440px, 390px, and 320px; visible artwork loaded and no horizontal overflow was observed.
- Batch 2 live previews confirmed both dropdowns, a keyboard Enter activation, correct project URL, no page errors, and no horizontal overflow at 1440px, 390px, and 320px. Intermediate widths were visually checked and adapted to a stacked layout.
- Batch 3 live previews confirmed a smooth intermediate dropdown height, final open/closed heights, keyboard section switching, no runtime errors, and no horizontal overflow at desktop and mobile widths. Reduced-motion previews reached the final state immediately.
- Batch 4 live playtests reached the lower, middle, and upper branches, then both Resume and Portfolio lines. Landing opened the correct dropdown. Escape reset the game; direct dropdown controls still worked while playing; Lenny stayed hidden on mobile. TypeScript, targeted ESLint, and Prettier checks passed.
- Batch 5 screenshots compared desktop home/open states and 390px/320px mobile open states with Figma. Browser checks at 1440px, 768px, 390px, and 320px found no page errors or horizontal overflow; all visible artwork loaded, direct dropdowns stayed mutually exclusive with keyboard activation, and mobile portfolio links measured at least 44px high. Desktop tree and Lenny images loaded; mobile made no requests for those hidden images after lazy loading was restored.
- Batch 5 checks passed: Blade TypeScript, targeted ESLint, Prettier, `pnpm analyze:react:changed` (zero failures), and `git diff --check`. Repo-wide commit gates are reserved for the later commit step.
- Follow-up browser checks loaded all 16 original walk frames after activation, observed movement and facing changes with ArrowLeft, and observed a Space jump. Repeated jumps reached the lower, middle, and upper branches; landing on Resume and Portfolio opened their dropdowns. Escape returned to the resting Lenny image. At 390px and 320px, Lenny remained hidden, no walk frames were requested, and there were no page errors or horizontal overflow. All copied frame files match the earlier portfolio byte-for-byte; `lenny-walk.ts` differs from the earlier `walk.ts` only in scene/player dimensions and an explanatory comment. Blade TypeScript, targeted ESLint, Prettier, React change analysis, and `git diff --check` passed.
- Sprite-sheet browser checks observed one successful atlas request after activation and no atlas requests on the 390px mobile view. The displayed frame index advanced with walking while facing and jumping still worked. After deleting the separate route-local files, browser play reached the lower, middle, and upper branches, opened Portfolio on landing, and returned to the resting image with Escape; no page errors occurred. The atlas is 208 KB, down from roughly 1.1 MB of separate frames; a pixel comparison at display size found average visible RGB difference 4.43/255 and alpha difference 0.65/255 from the source frames. Blade TypeScript, targeted ESLint, Prettier, React change analysis, and `git diff --check` passed.
- Enlarged Lenny browser check measured the active sprite at 112×145 CSS pixels with no outline. Browser play still reached all three left branches and opened Portfolio on landing. Blade TypeScript, targeted ESLint, Prettier, React change analysis, and `git diff --check` passed.
- Local preview PNGs are in the parent DevTeamPR staging folder under `assets/`; they are not part of the Forge change.
- Forge's normal dev script expects a local `.env`; the local preview server uses temporary process values for required public variables. No `.env` file was added.

## Links

- Design: `https://www.figma.com/design/s3HvdGEvDmP0ocp87NkbBF`
- Fork: `https://github.com/StevScripts/forge`
- PR: none
