# Stevin Dev Team Application Test Cases

Status: Active local review

## Browser cases

1. At desktop width, both upper panels start closed. Opening either shows the matching current preview and closes the other. The lower two links remain visible.
2. At 320px and 390px, the four destinations stack in order, previews fit the screen, and the page has no horizontal overflow. Tree and Lenny are hidden.
3. Resume and Portfolio buttons activate with Enter. Their preview links point to the full PDF and website. GitHub and LinkedIn are direct anchors with external arrows and no dropdown state.
4. Activating Lenny loads the sprite sheet. Tree jumps still reach Resume and Portfolio; landing opens the matching panel. The two lower link rows are reachable platforms. Landing highlights a link without opening a tab; Enter opens the landed link. Escape restores resting Lenny.
5. With reduced motion enabled, content reaches its final visual state without waiting for the normal entrance or dropdown animation.

## Static checks

Run Blade TypeScript, targeted ESLint and Prettier, React change analysis, and `git diff --check`. Capture desktop and mobile screenshots to review the actual layout.
