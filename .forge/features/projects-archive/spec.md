# Knight Hacks Projects Archive Spec

Status: P3.2 authoring and consent foundation implemented; editorial publication and Projects UI integration remain.

This file owns product intent. [Status](status.md) records implementation and remaining approval gates.

## User-facing purpose

Projects is a curated technical publication showcasing exceptional work from the broader Knight Hacks community, wherever it was built. Readers learn how selected projects were built, which decisions mattered, and what worked or failed. Creators submit detailed technical writeups directly on Projects. Knight Hacks reviewers select which submissions to feature; submission never publishes a case study automatically.

## Confirmed requirements

- C1: Knight Hacks community members, including alumni, may submit their own work from Knight Hacks, another hackathon such as ShellHacks, or independent work. A current Member row is not required.
- C2: Creation, editing and submission directly on Projects.
- C3: Authentication through existing Blade identity.
- C4: Separate technical and editorial capabilities; no self-approval.
- C5: External image URLs and video links for MVP; no native uploads.
- C6: Explicit coauthor consent before public attribution.
- C7: Case studies are independent of Blade's hackathon project database. Event participation, Devpost records and awards are optional provenance, not eligibility requirements. There is no import or synchronization flow.
- C8: Reuse Forge infrastructure; no additional backend services or expansion of Blade's operational footprint.
- C9: Claimed awards and affiliations must be checked during editorial review before publication.

P1 implemented delegated authentication, P3.1 persistence and P3.2 authoring/consent. G2's reviewer separation and G3's publication checks remain for the editorial API. See [status.md](status.md).

## Users / actors

- Visitors read published case studies without an account.
- Authors draft and submit using Blade identity, regardless of current membership, dues or event attendance.
- Coauthors verify their account association and control public attribution. Consent does not grant editing rights.
- Technical reviewers assess implementation, evidence, accuracy and limitations.
- Editorial reviewers assess clarity, attribution, media and publication readiness.

## User-visible interface

All archive, author, consent and review screens belong on Projects. A new Blade editorial dashboard is outside scope.

### Reader journey

Browse a bounded archive of selected work showing title, summary, technical context and consented attribution. Open a readable case study with problem, implementation, technical decisions, results, limitations, approved images, optional event provenance and repository/demo/video links. Unavailable content must not expose private drafts.

### Author journey

Sign in using Blade, return to Projects, create a draft, save and preview privately. Enter structured technical sections, external media links and proposed attribution. Invite coauthors by manually sharing links; no automatic email is promised. Show save failures, validation errors, pending consent and review status explicitly.

Submit a fixed revision for technical review, then editorial review. Optional event, Devpost and award claims are supplied by the creator and do not confer eligibility or publication. Requested changes or editing after submission create a new revision; the reviewed version remains in private history. Editing a published article leaves the live version unchanged until another revision passes review. Authors can withdraw their publication.

Under the approved G4 eligibility rule, the submitting author declares their connection to Knight Hacks. Blade sign-in confirms which account submitted the work; it does not establish community membership. A current Member profile is optional. Editors check the declaration against existing records or supporting evidence before publication. Coauthors control their public attribution through consent and do not each need Knight Hacks membership.

### Coauthor journey: G3

An invited person signs in through Blade, inspects the proposed public attribution and affirmatively accepts or declines. A new Blade account is sufficient; no historical event check-in is required. For an invitation not initially bound to an account, the author confirms the recipient account association before publication. Possessing a shared link alone is not historical identity proof.

Consent applies to the exact attribution snapshot for this case study: public name, contribution, profile links and permitted display surfaces. Unchanged attribution can retain consent across narrative revisions. Changing that snapshot requires renewed acceptance. Attribution consent does not endorse every technical statement in an article.

Pending, declined or revoked attribution never appears publicly. Recommend blocking publication while a listed coauthor lacks consent. People unable to use existing Blade login remain undisplayed; alternate authentication is outside MVP.

Coauthors revoke consent from their Projects workspace. Recommend suspending affected publication immediately until a reviewed replacement removes the identity, or consent is restored and publication explicitly reauthorized. Already downloaded or independently cached third-party copies cannot be recalled.

### Reviewer journey: G2

Open a permission-specific queue and inspect an immutable revision. Approve, request changes with feedback, or reject. Under G4, editorial review records who checked the submitting author's Knight Hacks connection and the result. It also checks claimed event affiliations and awards against evidence before approval. No author/coauthor may approve their submission, including elevated accounts. Different people complete technical and editorial approval. An editorial reviewer publishes only when both approvals and required consents are valid. Missing conditions remain visible as actionable blockers.

## Scope

### In scope

- Public archive/detail views; Projects-local authoring, consent and review; private revision history; publication and withdrawal; optional event provenance and external project links; existing Blade login integration; safe external media links.

### Out of scope

- Native uploads, outbound email, new identity providers, additional backend services, media proxies, scheduled publication workers, notifications, comments, ratings, Devpost or event imports/synchronization, judging changes, search infrastructure or a configurable workflow engine.
- Reviewer/publication API, Projects workspace UI and release remain separate slices.

## Vocabulary

- Case study: durable curated article identity independent of a source project.
- Revision: a content version frozen on submission.
- Attribution snapshot: exact public identity/contribution information a person accepts.
- Publication: the approved revision currently available to visitors.
- Suspension: public availability is removed without erasing private history.
- Provenance: optional creator-supplied context about where the work was built, including event and award claims that editorial review verifies before display.

## Acceptance criteria

- AC01: An alumni author without a Devpost record can draft and submit directly on Projects using Blade identity.
- AC02: Unrelated accounts cannot inspect or edit private drafts.
- AC03: Submitted content cannot change beneath a reviewer; replacement revisions need fresh review.
- AC04: Both capabilities are enforced and self-approval fails. Under G2, the same person cannot complete both stages.
- AC05: Public identity requires affirmative applicable consent. Under G3, unchanged attribution retains consent; changed attribution requires renewal.
- AC06: Visitors see only the selected published revision; drafts, contacts and private feedback remain private.
- AC07: Under G3, revocation removes affected availability on subsequent public reads, including discovery and metadata.
- AC08: Permitted Devpost replacement/deletion cannot overwrite or remove a case study.
- AC09: External images have alt text and failure states; video links work without upload/embed services.
- AC10: The complete journey supports keyboard access and 320px/mobile and desktop layouts.
- AC11: A member can submit independent work or work from another hackathon without a Knight Hacks event record, Devpost record or award. Submission remains private until selected and published by reviewers.
- AC12: Event affiliations and awards appear publicly only after editorial verification; unverified claims block publication or are removed in a new reviewed revision.
- AC13: Under G4, an author without a Member profile may submit after declaring their Knight Hacks connection. Publication requires a recorded editorial eligibility decision and reviewer; coauthors need attribution consent, not individual membership checks.
- AC14: Under G4, deleting a Blade account is not blocked solely by Projects activity. A creator may transfer ownership before deletion; otherwise their case study is withdrawn. Deleted accounts lose public attribution, while the private record retains only the identifiers and decisions needed for editorial accountability.

## Open questions

See G2-G5 in [status.md](status.md) for the remaining decisions and implementation approvals. The confirmed requirements are settled and must not be re-questioned.
