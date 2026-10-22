# Knight Hacks Projects Archive Status

Current phase: P3.1 persistence and validator implementation. Publication remains disabled; authoring and review APIs have not started.

Branch/worktree: `projects-case-study-domain` at `/home/kwaii/forge-projects-p3`, based on `projects-public-site`. This bundle carries the earlier Phase 0 proposal into P3.1; P1 and P2 worktrees remain separate.

## Decision log

- 2026-10-21: User authorized documentation only. Confirmed community/alumni eligibility, authoring on Projects, Blade identity, separate review capabilities/no self-approval, external images/video links, explicit coauthor consent and independence from judging records.
- 2026-10-21: Recommend all public/author/consent/review UI on Projects. Supersedes prior suggested Blade author/reviewer screens and respects the footprint constraint.
- 2026-10-21: Verified existing portal auth/SDK already provides PKCE/state, cookies, refresh/revoke and parent-session verification. Recommend minimally extending that boundary for a non-event client, not a new identity/token service, parallel adapter or dummy hackathon.
- 2026-10-21: Recommend attribution-snapshot consent reusable across unchanged attribution. Supersedes prior recommendation to re-consent for every narrative revision. Review approvals remain exact-revision.
- 2026-10-21: Redirect SSO, two distinct reviewers and snapshot consent/revocation remain recommendations, not silently approved decisions.
- 2026-10-22: Product scope clarified: Projects publishes selected technical work from Knight Hacks, other hackathons and independent work. Event participation, Devpost and awards are optional; editorial review verifies displayed affiliation/award claims. No case-study foreign key to judging projects and no import/synchronization flow.
- 2026-10-22: P1 delegated Projects authentication is present in the integration base. P2 supplies a static, illustrative public UI. P3.1 planning owns independent persistence and contracts; it does not change either implementation.
- 2026-10-22: Proposed G4 eligibility model reviewed: Blade proves account identity; the submitting author declares a Knight Hacks connection; editorial review records verification and reviewer before publication. Coauthors need attribution consent, not individual membership verification. This is a proposal awaiting G4 approval.
- 2026-10-22: Account-deletion review found that self-service `member.deleteMember` deletes `auth_user`, while admin member deletion retains it. Replacing the proposed restrictive case-study user foreign keys with fail-closed `SET NULL`/`CASCADE` behavior and minimal UUID audit snapshots is recommended. G2-G4 are recommended for approval, not approved.
- 2026-10-22: User explicitly authorized the P3.1 eight-table persistence, additive migration, contracts and reviewer capability definitions, including G2-G4 rules in this slice. This does not authorize API workflows, capability grants, provisioning, publication or release. The account-deletion cleanup remains a prerequisite for public publication.
- 2026-10-22: Implemented revision attribution snapshots as paired UUID and hash arrays rather than arbitrary JSON, preserving the approved subject/hash-only retention model. PostgreSQL checks enforce equal counts and canonical hashes. Evidence-basis and publication reasons use fixed codes to avoid free-form personal data in permanent decisions.

## Open questions

G2-G4 are approved for the P3.1 foundation. Their API enforcement and account-deletion cleanup remain later work. G5 release and media-origin decisions remain open. P1 completed the backend portion of G1; Projects browser integration and client registration remain later work.

## Approval ledger

| Gate | Recommendation / requested decision                                                                                                                                                                  | State                                                                              | Blocks                                                          |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| G1   | Use existing delegated auth for a non-event Projects client, with Projects-local UI and no new service.                                                                                              | P1 backend implemented; browser integration and client provisioning remain pending | Protected Projects transport and release                        |
| G2   | Require different non-author accounts for technical and editorial review; editorial capability can explicitly publish only after all gates pass.                                                     | Approved for P3.1 definitions; enforcement waits for API slice                     | Review/publication implementation                               |
| G3   | Consent binds case-study attribution snapshot/policy; unchanged attribution may retain consent. Revocation suspends affected publication until a reviewed replacement or explicit valid restoration. | Approved for P3.1 persistence; enforcement waits for API slice                     | Consent/publication implementation                              |
| G4   | Eight tables, generated migration, immutable-row guards with one-way privacy redaction, account-deletion semantics, retention and indices 30/31.                                                     | Approved for P3.1; no grants or account-deletion API cleanup yet                   | Publication remains disabled until cleanup and API verification |
| G5   | Approve app dependencies/runtime configuration, media origins/CSP, client registry/callbacks and eventual deployment/domain configuration.                                                           | Pending; no dependencies/config/deployment changed                                 | App setup and release as applicable                             |

Confirmed requirements C1-C9 in [spec.md](spec.md) are settled. The P3.1 schema, migration, validators and capability definitions are authorized by the implementation request. Protected APIs, capability grants, client provisioning and release still need their applicable decisions and checks.

## P3.1 implementation proposal

- Add standalone case-study, draft, revision, contributor, invitation, consent-decision, review-decision and publication-event tables under `@forge/db`. Use account IDs for ownership and consent. Revisions hold optional event provenance, award/affiliation claims, evidence URLs, external project links and technology tags. No foreign key, trigger or job connects them to `knight_hacks_project` or Devpost inventory.
- Keep a stable unique slug on the case study, compare-and-swap draft version, immutable submitted revision and event decisions with narrow one-way privacy redaction, and a same-case-study published-revision pointer. Owner deletion withdraws an untransferred study without blocking Blade account deletion. These DDL and lifecycle choices require G4 approval.
- Append `REVIEW_CASE_STUDIES_TECHNICAL` at permission index 30 and `REVIEW_CASE_STUDIES_EDITORIAL` at 31. Existing roles receive neither capability by default. Check the bits directly without officer/judge bypass. Assignment and authorization behavior require G2/G4 approval.
- Add Zod contracts for structured technical content, bounded tags and text, optional provenance/claims, HTTPS external links, media alt text and bounded public queries. Editorial approval applies to the exact revision and verifies displayed claims. Public output includes only published content and verified claims.
- First implementation slice after approval: schema, migration, validators and focused DB/contract tests. Author/consent API follows; review/publication API follows that. A later Projects UI slice replaces P2 fixtures. No P3.1 UI edit or import path is planned.

### G2-G4 approval packet: proposed, not approved

| Table                          | Key fields and constraints                                                                                                                                                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `case_study`                   | UUID primary key; globally unique, immutable slug; nullable owner `auth_user` foreign key `ON DELETE SET NULL`; nullable published revision; active/suspended/withdrawn visibility. Composite foreign key ties the published revision to this case study. No judging-project foreign key.                                                         |
| `case_study_draft`             | One mutable draft per case study; nonnegative version for compare-and-swap saves; owner `auth_user` foreign key `ON DELETE CASCADE`, reassigned on ownership transfer.                                                                                                                                                                            |
| `case_study_revision`          | UUID primary key; unique `(case_study_id, revision_no)` and `(id, case_study_id)`; immutable technical payload/hash, author connection category, provenance, attribution subject UUIDs/hashes and submitter UUID snapshot without user foreign key. One-way privacy redaction may erase payload/evidence while retaining hash and decision links. |
| `case_study_contributor`       | Unique `(case_study_id, user_id)`; raw current attribution and edit grant; user foreign key `ON DELETE CASCADE`. Removal from public display preserves the row while the account exists for self-review checks.                                                                                                                                   |
| `case_study_invitation`        | Unique hash of a random single-use token; target/redeemer/confirming-user foreign keys `ON DELETE CASCADE`, attribution hash, expiry and confirmation. No raw contact or attribution snapshot.                                                                                                                                                    |
| `case_study_consent_decision`  | Append-only subject UUID snapshot without user foreign key, exact case-study attribution hash, policy version, accept/decline/revoke action and time; no raw attribution.                                                                                                                                                                         |
| `case_study_review_decision`   | Append-only exact revision and stage, unique `(revision_id, stage)`, reviewer UUID snapshot without user foreign key, outcome and redactable private feedback. Editorial decision stores eligibility result, evidence-basis code and claim-verification result, without raw evidence.                                                             |
| `case_study_publication_event` | Append-only exact revision, publish/suspend/withdraw/transfer/anonymize action, actor UUID snapshot without user foreign key, coded reason and time. Publication pointer and visibility update under a case-study row lock.                                                                                                                       |

G2 proposal: append technical and editorial permission bits at indices 30 and 31, default denied for existing roles. Check each bit directly; officer/judge status is not an override. Historical authors/coauthors cannot approve or publish their own work, and technical/editorial approvals require different accounts. G3 proposal: exact attribution-snapshot consent survives unchanged narrative revisions; revocation suspends affected publication until a valid explicit restoration or reviewed replacement.

G4 eligibility proposal: the authenticated owner may draft and submit with a declared Knight Hacks connection even without Member/Hacker/event records. The declaration is frozen in the revision. An editorial reviewer may use existing records or supplied evidence, and records `verified` or `unable_to_verify` with an evidence-basis code on that revision's review decision. Only `verified` qualifies publication. Coauthors need consent but no membership check. A changed declaration requires a new revision and decision. This uses the existing review table, with no membership registry or verification service.

Deletion and retention proposal: account deletion must keep Blade's existing success path. A narrow cleanup within `member.deleteMember` withdraws untransferred studies, clears their public pointer, deletes drafts/invitations, revokes attribution, suspends affected publications and redacts private content before deleting `auth_user`. Accepted transfer may preserve ownership with another account; departing attribution still comes off the public page. Direct `auth_user` deletion fails closed through owner `SET NULL`, contributor cascade and public read guards, with residual private content requiring manual cleanup. Invitations expire after 14 days; raw attribution is removed with contributor rows; raw evidence is cleared after editorial decision, and withdrawal clears optional private feedback. Keep only coded decisions, content hashes and pseudonymous UUID actor snapshots for audit. No new service or job is proposed.

Planned P3.1 files: `packages/db/src/schemas/case-studies.ts`, `packages/db/src/schemas/relations.ts`, one generated migration and its Drizzle metadata under `packages/db/drizzle/`, `packages/validators/src/case-studies.ts` and its export, `packages/consts/src/permissions.ts`, `docs/DATABASE-USAGE.md`, plus focused DB/validator tests. Later API slices own `packages/api/src/routers/case-studies.ts`, a restricted Projects tRPC context/export, a narrow Blade transport route and API tests. `apps/projects` fixture replacement remains a later slice.

Remaining human decisions: explicitly approve G2-G4, including the revised per-table delete actions, one-way redaction exception, narrow `member.deleteMember` cleanup, transfer acceptance and suspension until a new reviewed revision, the manual privacy cleanup needed after exceptional direct database deletion, and who may receive the two reviewer capabilities. G5 client provisioning, media origins and deployment remain separate. Editorial verification performs no automated lookup or import.

## P3.1 implementation prompt after approval

On `projects-case-study-domain`, implement only the approved eight-table case-study schema, validators, permission indices 30/31 and additive Drizzle migration. Use the per-table delete actions and privacy-safe audit fields above; keep case studies independent of judging inventory. Add focused fresh/upgrade migration, direct user-deletion, immutability, same-study pointer and validator tests, plus affected-consumer checks. Keep P1 auth and P2 UI unchanged. The narrow `member.deleteMember` cleanup and Projects APIs belong to the following API slice and must land before real publication is enabled. Update this bundle with actual migration and validation evidence; do not provision clients, deploy or change media infrastructure in P3.1.

## Dependency-ordered PR plan

No PR or issue has been created. Each future PR must have the required issue reference, labels and assignee, use a task branch, update this file, and pass applicable checks. Parallel work is possible only where dependencies allow it.

| PR                                               | Dependencies / boundary                                                   | Acceptance criteria and proof                                                                                                                                                                           | Approval gates                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| P0: Phase 0 bundle                               | Current documentation-only work                                           | Four coherent docs distinguish confirmed/pending decisions, source evidence, cases and scoped PRs. No application/config changes.                                                                       | Documentation authorized; design approval pending |
| P1: Non-event delegated client support           | P0; `auth`, `db`, `validators` and minimal existing Blade protocol wiring | Implemented on the integration base: constrained non-event client, exact callback/audience checks and preserved event constraints. Client registration and release remain separate.                     | Backend implemented; G5 for provisioning/release  |
| P2: Public website                               | P1 integration base; `apps/projects`                                      | Static illustrative public homepage, archive and detail routes are implemented; fixture replacement waits for published API.                                                                            | Completed as a separate UI slice                  |
| P3.1: Case-study persistence/contracts           | P1/P2 integration base; `db`, `validators`, `consts`                      | Independent revision/attribution/decision/publication contracts, optional provenance, no judging-project link/import, preserved permission indices, fresh/upgrade migrations. No product queries in DB. | G2/G3 and G4                                      |
| P4: Author and consent API                       | P1, P3.1; `api`, narrow Blade transport                                   | Trusted delegated principal on restricted caseStudies surface; ownership, optimistic saves, submission freeze, manual invitations and snapshot consent. TC-002/003/004, TC-NEG-001/005.                 | G1 browser integration, G3/G4                     |
| P5: Review and public API                        | P4; `api`                                                                 | Distinct capabilities/no self-approval; G2 separation; transactional publication/revocation; explicit public list/detail projection. TC-005, TC-NEG-002/006, TC-REG-001.                                | G2/G3/G4                                          |
| P6: Projects app and public experience           | P2, P5; `apps/projects` with approved existing dependencies               | Server-rendered published list/detail and metadata; thin adapter; no DB/Blade secrets; empty/error/media states; keyboard and desktop/320px screenshots. TC-006/007 and public disclosure checks.       | Relevant G5                                       |
| P7: Projects author/consent workspace            | P6; `apps/projects`                                                       | Sign-in returns to Projects, drafts save/submit, invitations can be shared and accepted/revoked, private preview/history; no email/uploads. TC-002/003/004 plus selected E2E.                           | G1/G3                                             |
| P8: Projects review workspace and complete slice | P7; `apps/projects`                                                       | Bounded stage queues, immutable revision detail and decisions, publish/withdraw/suspend. Full TC-001 and revocation journey; no Blade editorial dashboard.                                              | G2/G3                                             |
| P9: Release preparation                          | P8; existing deployment infrastructure only                               | Approved container/client/origin configuration, staging verification, migration order and previous-version rollback. No new auxiliary service.                                                          | G5 and explicit deployment authorization          |

Split an oversized PR further rather than bundling unrelated refactors. P3.1 is the recommended next implementation slice once G2/G3/G4 decisions are recorded; P1 and P2 code remains untouched.

## First end-to-end vertical slice

An alumni author with no event/Devpost record signs into Projects through Blade, saves and submits one case study with external media and one coauthor, obtains affirmative attribution consent, receives technical and editorial approval from two distinct non-authors under G2, and publishes. Revoking the coauthor's consent then removes public availability under G3.

Acceptance: TC-001 and TC-008 pass together with ownership, self-review, stale-revision, public-disclosure and revocation cases; no event prerequisite, import, synchronization, email/upload service or Blade workspace is introduced; existing portal/import/claim/judging behavior stays intact. Passing UI screenshots alone is insufficient.

## Task list

- [x] Read repository instructions, feature templates and relevant source evidence.
- [x] Complete three independent read-only investigations and parent synthesis.
- [x] Record confirmed requirements and draft product, technical and behavioral artifacts.
- [x] Propose dependency-ordered PRs and explicit approval gates.
- [x] Reconcile product distinction and P3.1 plan with P1/P2 integration base.
- [x] Human decided G2-G3 for P3.1 contracts and behavior.
- [x] Human approved G4 persistence and permission definitions for P3.1; G5 remains pending.
- [x] Generate tests and implement approved P3.1 slice.
- [ ] Validate full slice and affected consumers before release.

## Historical Phase 0 validation

- Initial `git status --short`: clean; initial branch `main`.
- `git switch -c projects/phase-0-architecture`: sandbox blocked `.git` write; rerun with user-approved escalation succeeded.
- `pnpm forge:feature projects-archive "Knight Hacks Projects Archive"`: failed with `sh: 1: tsx: not found` and missing `node_modules`. No dependencies installed.
- Instantiated the four checked-in `.forge/templates/feature/` templates directly with standard-library file operations, then filled them. No additional artifacts/configuration changed.
- Final documentation checks: four expected files present; local Markdown links and SRD source-file paths resolve; no template placeholders/comments or trailing whitespace remain. Standard-library inspection passed.
- `git diff --check`: passed for tracked changes; the new untracked documents were additionally checked directly for whitespace. `git status --short` shows only `.forge/features/projects-archive/` added.
- `pnpm exec prettier --check .forge/features/projects-archive/*.md`: blocked with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL` / `Command "prettier" not found`. Formatting is not claimed to pass; run it after the normal development environment is available.
- No application tests, builds, servers, migrations or deployments run. No commits made. Root pre-commit checks remain required before any future commit.

## P3.1 documentation validation

- Read P1/P2 bundles and source conventions, then revised this bundle on the isolated P3 worktree. No application tests, schema generation, migration or protected API changes were made for this documentation update.
- `git diff --check`: passed for tracked P2 documentation edits. All four new archive documents also passed a direct trailing-whitespace and final-newline check.
- `pnpm exec prettier --check .forge/features/projects-archive/*.md .forge/features/projects-public-website/{spec,srd,status}.md`: blocked because this worktree has no installed Prettier (`Command "prettier" not found`). Formatting is not claimed to pass.
- G2-G4 approval-packet update: read AGENTS.md, the archive bundle and existing DB/permission patterns; `git diff --check` passed for tracked files, and all four archive documents passed a direct trailing-whitespace check. No migrations or application code were changed; no application tests ran.
- Account-deletion design update: inspected `member.deleteMember`, `deleteAdminMember`, their documented behavior and the audit-event schema. Revised only this archive bundle. `git diff --check` passed for tracked files; all four archive documents passed a direct trailing-whitespace check. No migrations, application code or tests were run.

## P3.1 implementation validation (2026-10-22)

- Added eight independent case-study tables and generated additive migration `0065_parallel_blacklash.sql`. Added same-study published-revision FK, unique identity/revision/consent/review constraints, account-delete actions, immutable-row triggers and one-way privacy redaction guards. Existing judging tables and P1 credential tables were not modified.
- Fresh migration and pre-P3 populated upgrade: passed on an isolated local PostgreSQL 18.6 cluster at `127.0.0.1:55441` through disposable databases. The Drizzle migrator applied all committed migrations and a second run succeeded without new changes; `drizzle-kit check` passed. Existing `auth_user` and judging-project rows survived the upgrade. Case-study DB tests passed 6/6; combined DB/P1 schema tests passed 13/13. Direct `auth_user` deletion, same-study pointer rejection, append-only rows, redaction, invitation limits, editorial eligibility and concurrent review uniqueness were exercised.
- Case-study plus judging validator tests passed 14/14. Delegated auth tests passed 24/24; judging access passed 9/9 with test-only local storage values; permission merge tests passed 5/5, including both new bits default denied for 30-bit stored roles. No API behavior, UI, deployment or client provisioning changed.
- Changed-package format, lint and typecheck passed. Repo-wide `pnpm format` reported three pre-existing P2 UI files and initially unformatted generated Drizzle metadata; the metadata was formatted, while P2 UI was preserved. An initial parallel repo-wide lint/typecheck run exceeded Node's default 2 GiB heap and left a generated validator declaration empty. A clean validator rebuild and serialized forced typecheck with a 4 GiB heap passed 34/34 tasks. Serialized forced repo-wide lint passed 32/32 tasks with warnings but no errors. The final repo-wide format recheck is recorded below.
- Publication stays unavailable because this slice has no case-study APIs. Before release, the API slice must integrate `member.deleteMember` cleanup, enforce non-author/distinct-reviewer rules, consent and eligibility under row locks, and make all public projections require a live owner and consented contributor rows. Direct SQL account deletion intentionally leaves pseudonymous audit snapshots and may require manual privacy cleanup of residual private revision content.
- Final repo-wide `pnpm format` recheck: 24/25 tasks passed. Only `@forge/projects` failed on three pre-existing P2 UI files (`archive-browser.tsx`, `project-artwork.tsx`, `projects.spec.ts`); `@forge/db`, `@forge/api` and all changed packages passed. Those P2 files were left untouched under branch isolation.
- **P3.1 verdict: READY for review.** Persistence, generated migration and contracts pass focused and affected-consumer checks. Publication remains disabled and is blocked on the later API/account-deletion slice and G5 release decisions. The pre-existing P2 formatting failure remains a separate merge check to resolve.

## Links

- [Product spec](spec.md)
- [Technical SRD](srd.md)
- [Behavioral test cases](test-cases.md)
- PRs: none created.
- Issues: none supplied or created; attach before implementation PR creation.
- Conversation: Projects Phase 0 documentation request, 2026-10-21; no external messages sent.
