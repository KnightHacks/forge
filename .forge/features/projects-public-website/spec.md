# Projects Public Website Spec

Status: P2 implementation in progress.

## User-facing purpose

Projects is a curated technical publication for exceptional work from the broader Knight Hacks community, wherever it was built. Members may submit their own Knight Hacks, other-hackathon or independent projects for selection by Knight Hacks reviewers. This first public slice demonstrates the reading experience with clearly labeled illustrative fixtures; it does not accept or publish submissions.

## Users / actors

- Visitors discover projects, browse technologies, and read technical case studies.
- Future authors and reviewers are outside this public-only slice.

## User-visible interface

- A branded editorial homepage with featured stories and technology discovery.
- A searchable, technology-filterable project archive.
- Long-form technical case studies with team/provenance labels, diagrams, code, related stories, and demo/repository links. Event participation and awards are optional context, never eligibility signals.
- A clear notice that current content is illustrative and does not describe real submissions, awards, or contributors.

## Scope

### In scope

- `apps/projects` with static server-rendered fixture pages and a small client-side archive filter.
- Responsive, accessible public navigation, homepage, archive, and case-study routes.
- Fixture content stored separately from presentation components.

### Out of scope

- Authentication, authoring, consent, editorial selection, claim verification, publication APIs, database changes, imports/synchronization, media uploads, infrastructure, or deployment.
- Production project claims, winner/award labels, or named contributor attribution.

## Acceptance criteria

- The home, archive, and detail pages form a complete working public experience.
- Search matches project titles, summaries, technology names, and categories.
- Technology filters combine with search and provide a useful empty state and reset action.
- Every fixture is visibly identified as illustrative and has no invented team attribution, award, or real project links.
- Case studies support substantial technical prose, architecture diagrams, code samples, challenges, tradeoffs, lessons, and related discovery.
- Pages remain usable with keyboard navigation and at 320px viewport width.

## Open questions

- Which reviewed case studies, consented contributors and verified claims will replace fixtures in a later publishing slice?
