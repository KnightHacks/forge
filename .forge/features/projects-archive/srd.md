# Knight Hacks Projects Archive SRD

Status: P3.1 persistence and P3.2 authoring/consent API implemented; editorial/public API, UI and release remain.

P3.1 implements the persistence and validator contracts below. P3.2 implements authoring, consent and account-deletion cleanup. Editorial review and publication remain planned. [Status](status.md) owns the approval ledger and validation evidence.

## Technical purpose

Add a curated technical publication for Knight Hacks community work through existing Forge packages. A creator may submit their own Knight Hacks, other-hackathon or independent project without an event, Devpost, award, Member or Hacker record. Submission creates a review candidate, never a public article. All product screens belong to `apps/projects`. Reuse Blade's existing identity/API hosting without new operational screens, workers, queues, media handling or another backend service.

P1 added delegated Projects credentials to the existing auth boundary. P3.2 added a narrow, restricted API transport in the existing Blade runtime. It adds no Blade authoring screens or operational service.

## Relevant principles

- [Engineering principles](../../../docs/agentic-development/forge-engineering-principles.md): thin apps, server-first rendering, tRPC and explicit authorization.
- [Repository conventions](../../../docs/REPO-CONVENTIONS.md): package placement and permission-aware procedures.
- [Database usage](../../../docs/DATABASE-USAGE.md): preserve inventory/membership semantics.
- [Frontend guidance](../../../docs/agentic-development/frontend-design-skill.md): hierarchy, bounded collections, accessibility and screenshots.
- [Feature workflow](../../../docs/agentic-development/README.md): specs and behavioral cases precede implementation.

## Verified reuse and gaps

| Source                                                                                              | Evidence / implication                                                                                                                                            |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/auth/src/config.ts`, `auth`                                                               | Discord Better Auth and DB sessions at Blade; no parent-domain cookie configuration. `mapProfileToUser` synthesizes email, which cannot verify contact ownership. |
| `packages/auth/src/callback-url.ts`, `sanitizeCallbackURL`                                          | General Blade login callbacks are same-origin. Keep this restriction.                                                                                             |
| `packages/auth/src/portal-session.ts`, `createPortalSessionService`                                 | P1 supports a `projects` client with no event ID, plus code exchange, refresh rotation, client isolation and parent session checks.                               |
| `packages/auth/src/portal-session-store.ts`, `databasePortalSessionStore`                           | P1 stores Projects credentials within the existing transactional, hashed credential tables.                                                                       |
| `packages/hacker-sdk/src/next.ts`, `createHackerSdkNextHandler`                                     | PKCE/state, host-only HttpOnly cookies, same-origin checks, refresh, revoke/logout and no-store responses. Reuse rather than copy an adapter.                     |
| `apps/2026/src/app/api/hacker-sdk/[...hackerSdk]/route.ts`                                          | Thin Next adapter integration precedent.                                                                                                                          |
| `packages/auth/src/portal-auth.ts`, `isAllowedPortalCallback`                                       | P1 binds Projects authorization to its exact registered callback. Preserve that boundary.                                                                         |
| `packages/api/src/trpc.ts`, `createTRPCContext`, `permProcedure`                                    | Main API expects verified Blade sessions. Permission loading does not enforce a capability; delegated credentials need a trusted adapter.                         |
| `packages/consts/src/permissions.ts`, `PERMISSION_DATA`                                             | Append capabilities without renumbering stable permission indices.                                                                                                |
| `packages/db/src/schemas/knight-hacks.ts`, `Project`, `ProjectMember`, `ProjectClaim`               | Event inventory/contact/claim data is not publication ownership, eligibility or consent. Do not link case-study identity to these tables.                         |
| `packages/api/src/projects-import.server.ts`, `importDevpostProjects`                               | Imported judging inventory can be replaced. P3 adds no import, synchronization or write path into this code.                                                      |
| `packages/api/src/utils/project-claims/claims.ts`, `requireClaimParticipant`, `selectProjectMember` | Check-in and claim rules cannot gate community eligibility or prove a publication claim.                                                                          |
| `apps/guild/src/trpc/server.ts`                                                                     | Local API/auth imports bring backend dependencies; do not copy that footprint into Projects.                                                                      |

## Access policy

| Actor              | Allowed operations                                                                                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public             | Bounded published list/detail and publication-safe metadata                                                                                                                                                                  |
| Author             | With a verified Blade identity, declare a Knight Hacks connection; create/edit own draft, submit, inspect own history, manage invitations, withdraw own publication. Editorial verification gates publication, not drafting. |
| Coauthor           | Inspect own attribution, accept/decline/revoke; no separate membership check and no editing rights by consent alone                                                                                                          |
| Technical reviewer | Review under `REVIEW_CASE_STUDIES_TECHNICAL` capability                                                                                                                                                                      |
| Editorial reviewer | Verify claimed affiliations and awards, record editorial decisions, explicitly publish/suspend under `REVIEW_CASE_STUDIES_EDITORIAL` capability                                                                              |

Both capabilities are defined and default denied; grants are still pending. Use existing configurable roles and explicit resolver checks. No implicit officer/judge authority. All authors/coauthors are excluded from approval, including elevated accounts. Retain contributor history so removing an author from the current display cannot enable self-approval. Under G2, approval actors must differ. Publication also rejects an author acting as publisher.

## Architecture / data flow

| Boundary                             | Ownership                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `apps/projects`                      | Public, author, consent and review UI; SSR; thin same-origin protocol adapter   |
| Existing Blade runtime               | Existing identity/API host; narrow client support extension after approval      |
| `@forge/auth` and existing SDK       | Reused protocol/session machinery, minimally extracted within existing packages |
| `@forge/api`                         | Workflows, projections, permissions and transactions                            |
| `@forge/db`                          | Schemas, relations and migrations; no workflows                                 |
| `@forge/validators`, `@forge/consts` | Pure contracts, capability/lifecycle constants                                  |
| `@forge/ui`                          | App-agnostic primitives; domain UI stays in Projects                            |

Browser operations use the Projects same-origin adapter to reach the existing API host. Public SSR reads use typed HTTP tRPC. Projects receives neither DB credentials nor Blade's Better Auth secret. Do not proxy the whole privileged Blade router or add REST CRUD.

### Delegated authentication baseline

P1 already represents a non-event Projects client in the portal auth service/store. Reuse that verified boundary and preserve mandatory event bindings for existing clients. Do not create a dummy hackathon, duplicate token stack or identity service. Browser adapter work and client provisioning remain separate later slices.

1. Projects creates a short-lived browser-bound state/PKCE transaction and validated local return path.
2. Blade uses existing login and returns a single-use code to the exact registered Projects callback.
3. Reused adapter machinery exchanges the code server-side and sets Secure, HttpOnly, host-only cookies. No browser-readable token storage or credential logging.
4. Protected requests verify credential, client/audience, expiry/revocation and active parent Blade session. Load current permissions; never trust submitted account IDs or fabricate sessions from unverified headers.
5. A restricted Projects tRPC surface accepts the verified principal. Non-event clients cannot access event procedures. Preserve normal Blade and hacker-portal contracts.

Retain existing TTLs and refresh coordination unless explicitly changed. Exact callback registration rejects credentials, fragments and unregistered paths/origins; development exceptions are explicit. Cookie-authenticated mutations need same-origin/CSRF enforcement; SameSite alone does not isolate sibling subdomains. Auth/private responses are no-store.

Distinguish Projects-only revocation/cookie clearing from explicit Blade-wide logout through the existing front-channel flow. Parent revocation invalidates future protected operations. Test logout failures/retries; do not report global logout after merely clearing a local cookie.

Parent-domain cookies are outside the selected delegated-auth direction. Protected Projects API requests must still verify the delegated audience and session and enforce same-origin/CSRF policy.

## tRPC/API behavior

Create a separate `caseStudies` domain, preserving `projects`. Register platform exports through `packages/api/src/root.ts`; expose only approved procedures through the delegated transport.

- Public: `listPublished`, `getPublishedBySlug` with bounded cursor/limit and explicit output selection.
- Author: `listOwn`, `getOwn`, `createDraft`, `saveDraft`, `submitRevision`, `withdraw`.
- Consent: `createInvitation`, `inspectInvitation`, `acceptConsent`, `declineConsent`, `confirmContributor`, `revokeConsent`.
- Review: `listReviewQueue`, `getReviewRevision`, `recordDecision`, `publish`, `suspend`.

The public/review names above remain proposed; P3.2 author/consent procedure names are implemented in `packages/api/src/case-studies/router.ts`. Use shared typed contracts and standard `TRPCError` failures for unauthorized, forbidden, invalid and stale/conflicting requests. Private lookups must not disclose existence to unrelated accounts. Explain non-obvious contracts in schema/procedure descriptions. Under approved G4, Blade identity permits drafting/submission after an author declaration; editorial verification of community eligibility gates publication. A Member/Hacker/event row is neither required nor sufficient on its own, and coauthor attribution consent has no membership predicate.

Public projections include only current published content, verified claims and applicable consented attribution. Never serialize raw rows, unverified affiliation/award claims, contacts, invitations, review notes or unpublished versions. Use the same policy for HTML, RSC payloads, metadata, sitemap and APIs. Start without persistent publication caching: each public request checks current visibility. Client navigation revalidates rather than retaining indefinite publication caches. Already delivered content cannot be recalled.

## Validation

Use shared Zod contracts with explicit narrative/title, author/tag, URL and page-size limits before implementation. Render structured text or safe Markdown without raw HTML/MDX execution. Validate HTTPS URLs and approved media origins; reject credential-bearing URLs, unsafe schemes and local/private addresses. Video is an outbound link in MVP.

External images require alt text, stable layout and broken-image fallback. No uploads, scraping, server image proxy or unrestricted Next image optimization. Approved origin/CSP policy and safe link/referrer attributes are required. External hosts receive browser requests and may change content after review; support suspension/removal. Editorial review must inspect identities in narrative/media, since a byline filter alone cannot prevent disclosure. Media origins/configuration require approval before release.

## Data / migration / compatibility

The eight logical entities below have P3.1 schemas and migration. P3.2 implements authoring and consent; review and publication remain for a later API slice.

| Entity                 | Minimum contract                                                                                                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CaseStudy`            | Stable ID/unique slug, nullable owner account, nullable published revision pointer, visibility and timestamps; no judging-project foreign key                                                                                                                             |
| `CaseStudyDraft`       | Mutable proposed content with an expected-version check and linked draft owner; only authorized authors/editors may save                                                                                                                                                  |
| `CaseStudyRevision`    | Submitted technical content, content hash, author connection category, technology tags, optional event provenance and external links, attribution subject IDs/hashes, submitter UUID snapshot and timestamp; no raw byline or account contact data                        |
| `CaseStudyContributor` | Case-study/account association, current attribution fields and separately granted edit authority; retained while the account exists, including after display removal                                                                                                      |
| `ConsentInvitation`    | Optional target/redeemer account, attribution hash, hashed single-use token, expiry and account-confirmation state; no raw contact or attribution snapshot                                                                                                                |
| `ConsentDecision`      | Immutable case-study, subject UUID snapshot, attribution hash, policy version, acceptance/decline/revocation and timestamp; no raw attribution or `auth_user` foreign key                                                                                                 |
| `ReviewDecision`       | Immutable exact revision, stage, outcome, reviewer UUID snapshot and timestamp; editorial decisions also record eligibility verified/unverified, evidence-basis code and disposition of displayed affiliation/award claims, without raw evidence or reviewer contact data |
| `PublicationEvent`     | Immutable revision, publish/suspend/withdraw/transfer/anonymize action, actor UUID snapshot, coded reason and timestamp; no `auth_user` foreign key                                                                                                                       |

Draft saves use expected-version checks. Submitted content is immutable. Requested changes create another revision; old approvals cannot qualify it. A publication pointer must reference a revision of the same case study, enforced relationally and in API checks.

P3.1 DB constraints: unique case-study slug; one draft per case study; unique revision number within a case study; unique contributor account within a case study; unique invitation token hash; at most one terminal decision per revision and review stage; and a composite foreign key from the publication pointer to a revision with the same case-study ID. Existing audit-style PostgreSQL mutation-rejecting triggers protect submitted revisions, consent decisions, review decisions and publication events. The narrow privacy exceptions permit only clearing revision content/private evidence and review free-text feedback, with redaction timestamps; IDs, versions, content hashes, actors, outcomes and decisions cannot change. The slug is immutable. Workflow order, historical self-review exclusion and consent belong to later API transactions rather than a workflow engine.

Event provenance is an optional snapshot in the submitted revision, not a foreign key to `Project`, `Hackathon`, Devpost or award tables. It may include the event name, year and source URL, plus distinct award/affiliation claims. Independent work leaves event fields empty. External repository, demo and video URLs are optional validated links. Raw supporting evidence links are private, nullable and cleared after the editorial decision; the decision retains only an evidence-basis code. No background import, reconciliation, inferred award or automatic publication is part of P3. Editorial approval must record that displayed affiliation and award claims were verified against evidence; a changed claim needs a new revision and review. If evidence is insufficient, request a corrected revision without the claim.

Proposed G4 eligibility uses the same editorial decision rather than a membership table or separate verification workflow. The submitted revision freezes the author's declared Knight Hacks connection category. The editorial reviewer records `verified` or `unable_to_verify`, their account UUID, an evidence-basis code and decision time on the exact revision. An editorial approval requires `verified`; otherwise the reviewer requests changes or rejects. A new declaration needs a new revision and editorial decision. Coauthor consent remains separate and never requires individual membership verification. Existing Member, alumni, role or event records may support a decision but are not an automatic publication gate.

Under G3, consent binds exact case-study attribution (identity, contribution, links, display scope), not each narrative revision. Keep the raw currently displayed attribution only in the deletable contributor row; immutable revisions and consent events retain its canonical hash and subject UUID. Unchanged snapshot/policy retains consent; changed attribution needs renewal. If the contributor row disappears or its current attribution no longer matches the approved hash, public reads fail closed. New content still needs both exact-revision reviews.

Invitations are manually shared and authenticated. Known targets must match the recipient. Unbound invitations require author confirmation of the redeemed account before publication. Alumni can create an existing Discord-based Blade account without Member/Hacker/check-in prerequisites. Creator-entered names, emails, event affiliations and award claims never create consent or prove identity. No public account search or email delivery is required.

Publication, revocation and suspension serialize on the case-study row in a transaction. Publishing checks eligible revision/state, exact-revision approvals, G2 separation, non-author publisher, recorded editorial eligibility verification, verification of displayed affiliation/award claims and applicable consent for every displayed contributor. Repeated/concurrent actions must not duplicate decisions or resurrect suspended content.

Under G3, revocation suspends current publication using that consent and preserves private history. Restoration requires explicit authorization and valid conditions. Event and judging inventory changes cannot alter case-study content.

### Account deletion and retention recommendation for G4

Blade's `member.deleteMember` currently removes the signup response, Member and permission rows, then deletes `auth_user` in one transaction; auth accounts/sessions cascade. Admin member deletion removes only the Member profile. P3 must not add a new account-deletion blocker. A narrow case-study cleanup inside the existing self-service transaction withdraws studies still owned by the deleting account, clears their public pointer, removes drafts/invitations, appends coded withdrawal/anonymization events, and irreversibly redacts revision payloads and private evidence attributable to that account. It revokes the deleting coauthor's attribution and suspends an affected publication. An accepted ownership transfer before deletion changes the owner account; transfer does not carry the departing person's public attribution. The receiver must accept ownership, and publication is suspended until a replacement revision receives fresh consent and review. The existing Blade sign-out and storage cleanup remain unchanged.

The schema independently fails closed if `auth_user` is deleted outside that path: `CaseStudy.ownerUserId` becomes null; contributor and account-bound invitation rows cascade away; public queries require a live owner and every displayed contributor's current, consented attribution. An unowned case study has no author edit access and cannot publish until an explicit editorially authorized transfer. Direct database deletion still needs a manual privacy cleanup for residual private revision content; the application deletion path performs that cleanup automatically. Neither path may leave an orphaned public article.

User-linked foreign keys: `CaseStudy.ownerUserId ON DELETE SET NULL`; `CaseStudyDraft.ownerUserId ON DELETE CASCADE` (ownership transfer reassigns the draft); `CaseStudyContributor.userId ON DELETE CASCADE`; invitation target/redeemer/confirming-user IDs `ON DELETE CASCADE`. Revision submitter, consent subject, review actor and publication actor are immutable UUID audit snapshots without `auth_user` foreign keys, following Forge's audit-event pattern. An unbound invitation's confirmed account association must be copied into the consent decision as a confirmer UUID snapshot before the invitation is consumed; deleting the invitation cannot erase that proof. Store no names, emails, Discord IDs, raw attribution or raw evidence in those immutable fields. A deleted account's UUID remains only where needed to prove who submitted, consented, reviewed or published; it cannot be used to authenticate or restore consent.

Invitations expire after 14 days, and redemption/revocation clears their token hash. Raw attribution disappears with the contributor row on account deletion. Raw supporting evidence is erased after an editorial decision. Withdrawal clears pending invitations, private evidence and optional free-text review feedback while retaining coded decisions; account deletion also redacts attributable content and any remaining feedback. Technical content remains immutable while usable, with the one-way redaction exception above for privacy requests and account deletion. UUID actor snapshots and content hashes remain only for audit. No new job or service is needed.

### Migration and rollback

Use existing PostgreSQL/Drizzle. P3.1 generated additive migration `0065_parallel_blacklash.sql`; it preserves event-client constraints, permission indices and judging inventory. Fresh DB and pre-P3 upgrade paths were checked on isolated PostgreSQL. Recheck client relationships and existing claims/imports before release. Never use production for development validation.

Deploy compatible protocol support before provisioning a Projects client; enable publishing only after security/consent checks pass. Rollback disables the client/public reads and restores the prior compatible app version, retaining content/audit data. Do not drop populated tables or rewrite historical migrations. Demonstrate schema backward compatibility before release.

## Discord integration

Reuse existing identity and role management only. No new Discord side effects, role synchronization, announcements, email delivery or jobs.

## Configurability review

Would this require a developer change next year?

- No annual/event constants. Grants use existing configurable roles.
- Runtime/media origin settings are approved infrastructure constraints, not annual product configuration.
- A fixed two-stage workflow is intentionally sufficient for MVP; no generic workflow engine.

## React / frontend constraints

Proposed Projects routes: `/`, `/projects/[slug]`, `/workspace`, `/workspace/[id]`, `/consent/[token]`, `/review`, and revision review detail. Pages remain server-first; interactivity stays in focused components. Refresh server props with `router.refresh()` and invalidate client-owned queries only. Keep private state out of public caches.

Reuse UI primitives and document a restrained technical-archive direction: readable long-form typography, code/evidence sections and one Knight Hacks selection mark. Use bounded queues and a full-width editor; long workflows do not belong in dialogs. Include loading, empty, error, saved and conflict states. Verify long narratives, 60+ archive entries, keyboard use, reduced motion, desktop and 320px screenshots. Do not import another app's component internals.

## Testing / verification strategy

[Test cases](test-cases.md) are the behavioral oracle. Tests belong in owning auth/SDK/API/validator packages and Projects E2E, with Blade/2026 portal regression coverage. [Status](status.md) contains PR dependencies and gates. No application tests/builds/migrations ran in Phase 0.

## Open questions

G2-G4 were approved for persistence and author/consent work. Reviewer grants, media origins, client provisioning and deployment still need decisions. Editorial/publication API and Projects UI integration remain unimplemented; publication remains disabled.
