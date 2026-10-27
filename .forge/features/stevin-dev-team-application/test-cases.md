# Stevin Dev Team Application Test Cases

Status: Active local review

## Browser cases

1. At desktop width, the page has no top logo, UCF label, or header divider. Both upper panels start closed with compact spacing. Opening either shows the matching current preview and moves the lower links down while the tree, resting Lenny, and grass stay in place. Closing restores the compact rows; opening the other switches panels. The lower two links remain visible.
2. At 320px and 390px, the four destinations stack in order, previews fit the screen, and the page has no horizontal overflow. Tree and Lenny are hidden.
3. Resume and Portfolio buttons activate with Enter. Their preview links point to the full PDF and website. GitHub and LinkedIn are direct anchors with external arrows and no dropdown state.
4. Activating the enlarged Lenny loads the sprite sheet and shows the short controls above the grass without covering the lower links. Tree jumps still reach Resume and Portfolio from the compact scene; landing opens the matching panel and Lenny stays on its moving heading while the tree remains fixed. The two lower link rows are reachable platforms. Landing highlights a link and adds the Enter instruction without opening a tab; Enter opens the landed link. Escape restores resting Lenny.
5. With reduced motion enabled, content reaches its final visual state without waiting for the normal entrance or dropdown animation.

## Static checks

Run Blade TypeScript, targeted ESLint and Prettier, React change analysis, and `git diff --check`. Capture desktop and mobile screenshots to review the actual layout.
