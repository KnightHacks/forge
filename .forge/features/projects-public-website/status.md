# Projects Public Website Status

Current phase: P2 public frontend implemented and locally verified.

## Decision log

- 2026-10-21: Implement the P2 public surface only; authoring, consent, review, and backend remain later slices.
- 2026-10-21: Build on a separate `projects-public-site` worktree based on `main` to preserve the P1 `projects` checkout. The preferred `projects/public-site` branch path conflicts with the existing local `projects` branch.
- 2026-10-21: Use visibly illustrative, unnamed fixture content and local SVG art; avoid real-project/winner claims, remote images, and new dependencies.
- 2026-10-21: Use the existing Knight Hacks logo asset and shared Forge button primitive; keep the public app static, with client-side archive filtering over replaceable fixtures.
- 2026-10-21: Align the public app with Club's visual identity: local gold wordmark/sigil and hero poster, Montserrat display/body typography, plum/purple backgrounds, gold and rose accents, and bold high-contrast controls.

## Open questions

- Real published case studies, approved attribution, and confirmed public demo/repository URLs remain future content inputs.

## Task list

- [x] Read Forge instructions, Projects planning bundle, and frontend guidance.
- [x] Inspect Guild, 2026, Blade, and shared UI conventions.
- [x] Create isolated P2 worktree from `main`.
- [x] Build the public homepage, archive, fixtures, and case-study route.
- [x] Verify archive interactions, navigation, keyboard access, 320px responsiveness, and rendered pages.
- [x] Run app quality checks and production build; attempt repository gates.

## Validation / commands

- `pnpm forge:feature projects-public-website "Projects Public Website"`: blocked because this isolated worktree has no `node_modules` (`tsx: not found`); created the four feature docs from Forge templates and filled the requested P2 scope.
- `pnpm --filter @forge/projects format`: passed.
- `pnpm --filter @forge/projects lint`: passed with no warnings.
- `pnpm --filter @forge/projects typecheck`: passed.
- `pnpm --filter @forge/projects exec playwright test`: passed, 5/5 Chromium tests. Covers home-to-archive-to-case-study navigation, repository link, technology filter/search/empty/reset, technology discovery deep link, keyboard skip-link/focus, 320px horizontal overflow across all page types, and branded not-found navigation.
- `pnpm analyze:react:changed`: passed; analyzed 10 changed app files and 5 components, 0 failures.
- `pnpm --filter @forge/projects build`: passed; home and not-found are static, archive is dynamic for query-string filters, and all 4 case studies are statically generated.
- `pnpm format`: passed across the repository.
- `pnpm lint` and `pnpm typecheck`: attempted across the full workspace; unrelated package processes hit Node's 2 GB heap limit under Turbo parallelism. App-scoped lint and typecheck passed. Workspace lint output included warnings in unchanged legacy packages; no warnings were reported for `@forge/projects`.
- Rendered Club-styled desktop home and 320px archive/case-study screenshots inspected locally: `/tmp/projects-home-club-style-desktop.png`, `/tmp/projects-archive-club-style-320.png`, `/tmp/projects-case-club-style-320.png`. Confirmed the official wordmark loads and pages have no horizontal overflow at 320px.

## Links

- PRs: none created. This P2 work targets the existing non-production GitHub `projects` branch; `main`, deployment, authentication, API, database, and infrastructure are outside this update.
- Issues: none supplied.
