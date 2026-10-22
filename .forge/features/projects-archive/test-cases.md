# Knight Hacks Projects Archive Test Cases

Status: Proposed behavioral oracle; awaiting approval. No tests generated or run.

Cases marked G2/G3 specify recommended designs, not accepted requirements. P1 covered the delegated authentication backend; P3 implementation tests require the applicable G2-G4 decisions. AC references point to [spec.md](spec.md).

## Scope

Cover Projects authoring for Knight Hacks, other-hackathon and independent work; existing Blade identity integration; consent; two-stage review; claim verification; publication; external media; and unchanged platform behavior. Exclude imports, synchronization, uploads, email delivery, new providers/services and live production operations.

## Test placement plan

- `packages/auth/src/tests`: delegated client/callback/session unit and DB integration cases; extend existing portal-session suites.
- `packages/hacker-sdk/src/tests`: reused Next adapter state/PKCE/cookie/CSRF/logout cases; preserve existing adapter tests.
- `packages/validators/src/tests`: content, attribution, transition and external URL contracts.
- `packages/api/src/tests`: ownership/permissions, consent and publication transactions, explicit public output contracts; retain Devpost/claims/judging regression suites.
- `apps/projects`: focused component/integration cases and selected Playwright end-to-end journeys; Blade/2026 login regression where shared behavior changes.
- Migration verification: existing fresh-database and sanitized-upgrade process in an isolated development/test database, never production.

Future commands: package-filtered `test`/`typecheck`, Projects `e2e` once defined, root `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm analyze:react:changed`. Verify every affected shared-package consumer. These commands are planned, not executed evidence.

## Test cases

### TC-001: Complete community publication journey (AC01, AC04-AC06; G2-G3)

Setup:

- Alumni author and coauthor have Blade identities but no Member/Hacker/event/Devpost records. The author submits independent work. Two other accounts hold the separate review capabilities.

Action:

- Author signs into Projects, saves a technical case study with external media, shares a coauthor invitation and submits. Coauthor accepts the attribution; the author confirms an unbound account association. Technical reviewer approves; a different editorial reviewer approves and publishes.

Expected observations:

- Authoring stays on Projects. No event enrollment, award, new provider, email, upload or additional service is required. Submission is private until reviewers select and publish it. Public page/API show the exact approved revision and accepted attribution only.

### TC-002: Revision integrity and stale saves (AC03, AC06)

Setup: Two tabs read the same draft version; revision R1 is later submitted/published.

Action: Save conflicting changes, attempt to edit submitted R1, then create and submit R2.

Expected: A stale save conflicts without overwriting newer content. Submitted R1 remains immutable. R2 needs fresh reviews; R1 stays live until explicit replacement publication.

### TC-003: Attribution snapshot scope (AC05; G3)

Setup: A coauthor has accepted snapshot A for the case study.

Action: Submit a narrative-only revision retaining A; separately change the displayed name, contribution, link, display scope or consent policy to B.

Expected: A remains eligible without re-consent, but content still needs new reviews. B cannot publish until affirmatively accepted. Acceptance for a different case study never qualifies.

### TC-004: Consent invitation identity (AC05; G3)

Setup: One target-bound and one unbound invitation; recipient is a historical alumnus creating a Blade account.

Action: Redeem while authenticated, inspect attribution, accept/decline; confirm the unbound recipient association.

Expected: Target mismatch fails. Unbound acceptance alone does not qualify publication before account confirmation. Consent grants no edit authority. Decline/pending state exposes no public identity.

### TC-005: Withdrawal and revocation (AC06-AC07; G3)

Setup: A published revision uses consent A; author/coauthor is authenticated.

Action: Author withdraws, or coauthor revokes A; request detail, list, metadata, sitemap and RSC output afterward.

Expected: Publication is unavailable on subsequent requests. Private history is preserved. Restoration requires explicit authorization and valid reviews/consent. No claim is made about recalling already delivered third-party copies.

### TC-006: Accessible author and reviewer UI (AC09-AC10)

Setup: Long sections/names/URLs, 60+ archive entries, empty/error states and failed image hosts.

Action: Browse, edit, consent and review by keyboard at desktop and 320px widths, including save/submit failure and retry.

Expected: Bounded collections, visible focus, no document overflow, recoverable validation/conflict feedback, readable status labels and useful alt/fallback text. Capture and inspect real screenshots; no synthetic pass claims.

### TC-007: External media policy (AC09)

Setup: Approved HTTPS image origins and ordinary outbound video links.

Action: Render valid media; submit unsafe schemes, credentials, unapproved origins, local/private hosts and missing alt text.

Expected: Contracts reject invalid inputs; valid URLs remain usable with safe link/referrer behavior. No upload, scraper, server proxy or unrestricted optimizer runs. Editorial review rejects unconsented identities embedded in text/media.

### TC-008: Optional provenance and verified claims (AC11-AC12)

Setup:

- The same member prepares independent work, a ShellHacks project and a Knight Hacks project. None has a Blade judging-project or Devpost record. The ShellHacks writeup claims an award and includes an evidence link.

Action:

- Submit each writeup. Inspect the review queue and public API before approval; editorially reject the unsupported award claim, then submit a corrected revision. Verify a supported affiliation/award claim and publish the approved revision.

Expected observations:

- All three submissions are eligible and remain private until selected. Event provenance and external project links are optional. Unsupported claims cannot appear publicly; verified claims appear only on the approved revision. No import or synchronization job runs.

### TC-009: Declared community connection (AC13; G4)

Setup:

- A Blade account has no Member, Hacker or event row. The author declares a Knight Hacks connection and supplies supporting evidence. A coauthor has a Blade account but no Knight Hacks membership evidence.

Action:

- The author submits a revision; the coauthor accepts the exact attribution. An editorial reviewer records an unable-to-verify eligibility decision, then a later corrected revision receives a verified decision with reviewer and evidence-basis code.

Expected observations:

- Both submissions can reach review without a Member row. The first revision cannot publish. The corrected revision can publish only after fresh technical/editorial approval and consent. The reviewer and eligibility decision remain in private history; the public projection omits evidence and verification notes. The coauthor needs consent but no individual membership check.

### TC-010: Account deletion, transfer and anonymization (AC03-AC07, AC14; G3-G4)

Setup:

- Published studies include one sole owner, one owner who accepted a transfer to another account, one displayed coauthor and one reviewer. Each has a Member profile and can use Blade self-service account deletion. A separate admin can delete only a Member profile.

Action:

- Delete each account through `member.deleteMember`; separately delete an `auth_user` row directly in an isolated database. Request public list/detail and private history after each deletion. Exercise withdrawal and transfer before owner deletion, and attempt approval by a removed but still active contributor.

Expected observations:

- Blade self-service deletion still removes the auth user and sessions; admin Member-profile deletion leaves the auth user and Projects ownership intact. A sole owner's publication disappears and private drafts, invitations, evidence and identifying attribution are removed or irreversibly redacted. Transfer preserves a live owner but suspends affected publication until a reviewed replacement removes the departing attribution. Coauthor deletion removes attribution and suspends affected publication. Reviewer deletion retains the decision, stage, time and pseudonymous actor UUID without name/contact data. Direct user deletion cannot leave public orphaned content. A removed active contributor still cannot self-approve. Redaction preserves revision IDs, hashes and review decisions without allowing content replacement.

## Negative / regression cases

### TC-NEG-001: Authorization and private disclosure (AC02, AC06)

Setup:

- Anonymous, unrelated, revoked-session and author-only accounts; private drafts, feedback and invitations exist.

Action:

- Call protected procedures directly, alter object IDs, request guessed slugs, inspect HTML/RSC/metadata and submit forged account headers.

Expected observations:

- Requests fail with safe authorization/not-found behavior. No private rows, account/import contacts, invitation secrets or reviewer notes leak. Browser-supplied identity never establishes a principal.

### TC-NEG-002: Review separation and no self-approval (AC04; G2)

Setup: An author/coauthor has elevated permissions; another reviewer has both capabilities.

Action: Attempt self-approval, remove author from display then approve, approve without the relevant capability, or let one reviewer complete both stages.

Expected: Self-approval always fails, including after removal from current display. Missing capability fails. Under G2, the same reviewer cannot satisfy both stages. Officer/judge status alone grants no editorial authority. Revoked grants block future operations.

### TC-NEG-003: SSO callback and credential attacks (G1)

Setup: Registered Projects client and an existing annual portal client.

Action: Try wrong/missing state, wrong PKCE verifier, expired/replayed code, unregistered callback path/origin, credential-bearing callback, fragment, cross-client token and forged return path.

Expected: All invalid grants fail without a session. Safe local return paths survive successful login. No credential is exposed through JavaScript storage, logs or public responses. Production cookies are host-only, Secure and HttpOnly.

### TC-NEG-004: CSRF, refresh and logout (G1)

Setup: Projects session linked to a live Blade session.

Action: Send cookie-authenticated mutation from a sibling/foreign origin; race refreshes; revoke parent session; simulate logout upstream failure; disable client then attempt revocation.

Expected: Cross-origin mutations fail. Refresh coordination preserves legitimate concurrent behavior while rejecting malicious replay. Parent revocation stops subsequent protected operations. Logout accurately reports scope/failure and permits safe retry; disabling a client does not strand revocation.

### TC-NEG-005: Invitation replay and impersonation (G3)

Setup: Pending, expired, consumed and revoked invitation tokens; accounts with similar display names.

Action: Reuse tokens, accept on another account, supply a matching name/imported email as proof, or attempt author acceptance on behalf of a coauthor.

Expected: No identity proof by name/email. Target/account confirmation rules hold; tokens are hashed and single-use. Only the subject can affirm consent. An author cannot manufacture another user's acceptance.

### TC-NEG-006: Publication races and invalid references (AC03-AC07; G2-G3)

Setup: Approved revision and valid consent; concurrent transactions available.

Action: Race publish against revocation/suspension; publish a stale/unapproved revision or one belonging to another case study; repeat publication requests.

Expected: Transactions serialize on the case study. No public result retains revoked consent, bypasses approvals, crosses case-study boundaries or duplicates audit events. A stale request cannot undo suspension.

### TC-REG-001: Existing event and platform behavior (AC08; G1)

Setup: Existing portal clients, claims, evaluations, schedules and permitted replaceable inventory; a separately published case study describes a Knight Hacks event in its provenance snapshot without a judging-project link.

Action: Run existing portal login/refresh/logout and judging/import/claim suites; replace/delete source inventory where existing policy permits; try non-event credentials on event operations.

Expected: Existing event restrictions, claims, contacts, permissions and membership behavior are unchanged. Published content survives source replacement/removal. No import or synchronization modifies it; non-event clients gain no event access and no dummy event is created.

### TC-REG-002: Migration, rollback and identity lifecycle

Setup: Empty DB and sanitized existing DB; approved migration/deletion contract.

Action: Apply proposed migrations in isolation, exercise old and new clients, disable Projects client, restore prior compatible runtime, and exercise account deletion/ownership handling.

Expected: Constraints preserve event-client scope and permission indices; old consumers work. Rollback preserves content/history and denies Projects protected operations. Account deletion cannot leave unsupported public attribution or silently destroy publication history.

## Open questions

G2-G4 and concrete retention/deletion policies in [status.md](status.md) must be approved before implementing their corresponding P3 cases. Media policy and deployment require G5. Test failures must update the controlling spec/SRD rather than weaken assertions to match code.
