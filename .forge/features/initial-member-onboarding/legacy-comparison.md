# Initial Member Onboarding Legacy Comparison

Status: Ready for human review

This document identifies the behavior introduced by the current initial member onboarding diff, then compares it against the legacy Blade/API approach with efficiency, readability, and maintainability in mind.

## Feature Inventory

### 1. Landing And Discord Sign-In

Current behavior:

- `/` renders the new Blade landing page and redirects authenticated users to `/dashboard`.
- The Discord sign-in CTA uses the compatibility route at `/api/auth/signin?provider=discord&callbackURL=/dashboard`.
- `apps/blade/src/app/api/auth/signin/route.ts` delegates to the shared `@forge/auth/server` sign-in route.
- `apps/blade/src/app/api/auth/[...all]/route.ts` keeps the Better Auth handler available for callbacks and auth internals.

Primary files:

- `apps/blade/src/app/page.tsx`
- `apps/blade/src/app/_components/auth/discord-sign-in-link.tsx`
- `apps/blade/src/app/api/auth/signin/route.ts`
- `apps/blade/src/app/api/auth/[...all]/route.ts`

Legacy behavior:

- `/member/application` called `signIn("discord", { redirectTo: "/member/application" })` from the server page if no session existed.
- The member application was its own hardcoded route rather than flowing through a general form route.

Legacy files:

- `legacy/apps/blade/src/app/member/application/page.tsx`
- `legacy/apps/blade/src/app/api/auth/signin/route.ts`

### 2. Auth Profile Versus Member Profile

Current behavior:

- `User` remains the auth/account profile in `auth_user`.
- `Member` remains the member information row in `knight_hacks_member`, linked by `Member.userId -> User.id`.
- The feature does not introduce a new member table, guild profile table, or migration.
- `member.getMember` only reads the current session user's `Member` row.
- `member.createMember` derives `userId` and `discordUser` from the session instead of trusting client input.

Primary files:

- `packages/db/src/schemas/auth.ts`
- `packages/db/src/schemas/knight-hacks.ts`
- `packages/db/src/schemas/relations.ts`
- `packages/api/src/routers/member.ts`
- `packages/api/src/utils/member/profile.ts`

Legacy behavior:

- Also used `Member.userId` linked to the auth user, but the member router mixed onboarding, updates, admin reads, event dashboard data, QR code setup, company side effects, deletion, and logging in one router.

Legacy files:

- `legacy/packages/api/src/routers/member.ts`

### 3. Code-Owned Member Signup Form

Current behavior:

- Member signup lives at `/form/member-signup`.
- The form page requires a session, rejects unknown slugs, loads the code-owned form through `forms.getForm`, and redirects existing members to the form completion URL.
- The signup UI is rendered from `memberSignupFormDefinition`, not from a one-off page-specific field list.
- Form sections are `Personal`, `Academics`, and `Guild`.
- The form collects:
  - personal fields: first name, last name, email, phone, date of birth, gender, race/ethnicity, shirt size, Code of Conduct acceptance
  - academic fields: level of study, school, major, graduation term/year
  - Guild fields: visibility, profile picture, company, tagline, about, GitHub, LinkedIn, portfolio, resume
- The UI uses the real form callback flow: submit calls `forms.createResponse`, not `member.createMember` directly.

Primary files:

- `apps/blade/src/app/form/[slug]/page.tsx`
- `apps/blade/src/app/_components/member/member-signup-form.tsx`
- `packages/validators/src/member.ts`

Legacy behavior:

- Member signup lived at `/member/application`.
- The form was a large hardcoded React component with member-specific validation, upload handling, date transforms, and submit mapping in the component.
- It directly called `api.member.createMember`.
- It did not create a `FormResponse` for membership.

Legacy files:

- `legacy/apps/blade/src/app/member/application/page.tsx`
- `legacy/apps/blade/src/app/_components/dashboard/member/member-application-form.tsx`

### 4. Generic Forms Manager And Transactional Callback

Current behavior:

- `forms.getForm` and `forms.createResponse` are thin tRPC procedures.
- Generic form behavior lives in `packages/api/src/utils/forms/manager.ts`.
- Code-owned forms are upserted into existing `FormsSchemas` and `TrpcFormConnection` rows at runtime.
- `forms.createResponse` validates the response, enforces response roles and resubmission rules, inserts `FormResponse`, maps callback fields, and runs registered callbacks.
- For member signup, `member.createMember` is registered as a server-owned callback.
- The response insert and callback run inside one database transaction. If member creation fails, the response rolls back too.

Primary files:

- `packages/api/src/routers/forms.ts`
- `packages/api/src/utils/forms/manager.ts`
- `packages/api/src/utils/forms/config.ts`
- `packages/api/src/utils/member/onboarding.ts`

Legacy behavior:

- Legacy had a generic forms system, including `FormsSchemas`, `FormResponse`, and `TrpcFormConnection`.
- Generic forms submitted through `api.forms.createResponse`, but member signup did not use this path.
- Legacy generic callbacks were launched from the client success handler after the response was already saved.
- Callback failure was logged to Discord but did not roll back the form response or show the user that the connected side effect failed.

Legacy files:

- `legacy/packages/api/src/routers/forms.ts`
- `legacy/apps/blade/src/app/_components/forms/form-responder-client.tsx`
- `legacy/apps/blade/src/app/_components/forms/connection-handler.ts`

### 5. Member Creation

Current behavior:

- `member.createMember` validates with `memberSchema`.
- The actual insert path is shared with the form callback through `createMemberProfile`.
- The write path:
  - checks whether the current session user already has a member
  - calculates age server-side
  - normalizes empty optional strings to `null`
  - normalizes resume/profile-picture object names before persistence
  - inserts the `Member`
  - translates unique constraint errors into safe conflict messages
- `WriteDb` lets the same member creation path run with the normal DB client or inside the forms transaction.

Primary files:

- `packages/api/src/routers/member.ts`
- `packages/api/src/utils/member/profile.ts`
- `packages/api/src/utils/db.ts`

Legacy behavior:

- `createMember` lived in a large member router.
- It calculated age inline, normalized resume inline, inserted custom companies, generated QR code, inserted `Member`, cleaned unreferenced resumes, and logged to Discord.
- This was feature-rich but bundled multiple first-slice and later-slice behaviors into one onboarding mutation.

Legacy files:

- `legacy/packages/api/src/routers/member.ts`

### 6. Validators And Field Metadata

Current behavior:

- Generic form validators live in `packages/validators/src/forms.ts`.
- Member-specific shape lives in `packages/validators/src/member.ts`.
- The same member field list drives:
  - zod validation
  - signup UI rendering
  - legacy `FORMS.FormType` metadata
  - callback mapping
  - JSON schema for the forms manager
- `GuildProfile` is a type-level grouping for Guild-facing data, but persistence stays on `Member`.
- Code of Conduct acceptance is required by `memberFormSchema`, but is intentionally not persisted as a `Member` column.

Primary files:

- `packages/validators/src/forms.ts`
- `packages/validators/src/member.ts`
- `packages/validators/src/member.test.ts`

Legacy behavior:

- Validation was duplicated in multiple client components.
- The member application and settings member profile form both had inline zod extensions around `InsertMemberSchema`, duplicated age helpers, URL regexes, FileList validation, and base64 file conversion.
- The inline schema had `@ts-expect-error` around transformed zod types.

Legacy files:

- `legacy/apps/blade/src/app/_components/dashboard/member/member-application-form.tsx`
- `legacy/apps/blade/src/app/_components/settings/member-profile-form.tsx`

### 7. Resume Upload, Preview, Save, And Clear

Current behavior:

- Signup can upload a PDF resume before final form submission. The returned object name becomes the form field value.
- The signup UI previews newly selected PDFs through a local object URL.
- The dashboard lets an existing member upload, replace, remove, and view a resume.
- The dashboard resume preview opens in a dialog instead of expanding inline on the dashboard.
- Existing saved resumes are fetched only when the user opens the viewer, using a temporary signed URL.
- The API stores MinIO object names in `Member.resumeUrl`, not public URLs.
- Resume security validates PDF data URL shape, base64, file size, magic bytes, and current-user object ownership.

Primary files:

- `apps/blade/src/app/_components/member/member-signup-form.tsx`
- `apps/blade/src/app/_components/member/member-resume-upload.tsx`
- `apps/blade/src/app/_components/member/resume-preview.tsx`
- `apps/blade/src/hooks/use-object-preview-url.ts`
- `packages/api/src/routers/resume.ts`
- `packages/api/src/utils/resume/security.ts`
- `packages/api/src/utils/resume/storage.ts`

Legacy behavior:

- Resume upload already had solid server-side validation and signed URL download behavior.
- Member application/settings handled base64 conversion and upload sequencing inline.
- Dashboard resume behavior was a simple download button, not a preview/update UI.
- The legacy member router invoked unreferenced resume cleanup after create/update.

Legacy files:

- `legacy/packages/api/src/routers/resume.ts`
- `legacy/packages/api/src/resume-security.ts`
- `legacy/packages/api/src/resume-storage.ts`
- `legacy/apps/blade/src/app/_components/dashboard/member-dashboard/resume-button.tsx`
- `legacy/apps/blade/src/app/_components/dashboard/member/member-application-form.tsx`
- `legacy/apps/blade/src/app/_components/settings/member-profile-form.tsx`

### 8. Profile Picture Upload, Preview, Save, And Clear

Current behavior:

- Signup can upload a profile picture before final form submission. The returned object name becomes the form field value.
- The dashboard renders the profile picture as a circular Guild avatar.
- The dashboard has compact avatar overlay actions:
  - upload camera button on the lower right
  - destructive remove button on the lower left
- Removing the picture clears `Member.profilePictureUrl` and falls back to initials.
- Existing saved profile pictures are resolved through a temporary signed URL.
- The API stores MinIO object names in `Member.profilePictureUrl`, not public URLs.
- Profile-picture security validates accepted image data URLs, base64, size, magic bytes, server-generated object names, and current-user ownership.

Primary files:

- `apps/blade/src/app/_components/member/member-profile-picture-upload.tsx`
- `apps/blade/src/app/_components/member/member-signup-form.tsx`
- `packages/api/src/routers/profile-picture.ts`
- `packages/api/src/utils/profile-picture/security.ts`
- `packages/api/src/utils/profile-picture/storage.ts`

Legacy behavior:

- Profile-picture upload lived inside the broad `guild` router.
- The upload handler decoded the image, created the bucket, removed existing objects under the user's directory, uploaded the new object, and returned a public URL.
- Validation was thinner: content type came from the data URL prefix and object naming used sanitized client file names plus timestamps.
- Member application/settings called `api.guild.uploadProfilePicture` inline.

Legacy files:

- `legacy/packages/api/src/routers/guild.ts`
- `legacy/apps/blade/src/app/_components/dashboard/member/member-application-form.tsx`
- `legacy/apps/blade/src/app/_components/settings/member-profile-form.tsx`

### 9. Guild Profile Fields And Visibility

Current behavior:

- Guild fields are collected and displayed as a distinct conceptual profile:
  - profile picture
  - about
  - tagline
  - company
  - visibility
  - GitHub
  - LinkedIn
  - portfolio
- The code uses a `GuildProfile` type to group these fields while keeping storage on `Member`.
- Visibility copy says private profiles are still sponsor-visible, while public profiles are also visible to other members on `guild.knighthacks.org`.
- No new `GuildProfile` table is introduced.

Primary files:

- `packages/validators/src/member.ts`
- `apps/blade/src/app/_components/member/member-signup-form.tsx`
- `apps/blade/src/app/_components/member/member-dashboard.tsx`

Legacy behavior:

- Guild fields also lived on `Member`.
- Legacy public Guild reads were already in `guildRouter`.
- Signup copy described visibility as making the profile visible to other Knight Hacks members, but did not distinguish sponsor/staff visibility versus public member visibility.

Legacy files:

- `legacy/packages/api/src/routers/guild.ts`
- `legacy/apps/blade/src/app/_components/dashboard/member/member-application-form.tsx`

### 10. Member Dashboard

Current behavior:

- `/dashboard` server-checks session and renders an authenticated shell.
- `DashboardClient` uses `useMember`.
- If authenticated with no member, the hook redirects to `/form/member-signup`.
- While loading/redirecting, dashboard-shaped skeletons are shown.
- Errors are generic and avoid dumping tRPC internals to users.
- Loaded dashboard has:
  - left panel for member summary, academics, and resume management
  - right Guild social-profile card
  - desktop-height panel layout
  - top-level panels on lighter `bg-card/95`
  - nested rows/tiles/links on darker `bg-background/60`
- Dashboard entrance animations were removed to avoid skeleton-to-real-card layout glitches.

Primary files:

- `apps/blade/src/app/dashboard/page.tsx`
- `apps/blade/src/app/_components/member/dashboard-client.tsx`
- `apps/blade/src/app/_components/member/member-dashboard.tsx`
- `apps/blade/src/hooks/use-member.ts`
- `apps/blade/DESIGN_SYSTEM.md`

Legacy behavior:

- `/dashboard` loaded a broad `UserInterface` with session navbar and Discord modal.
- The member dashboard included dues, points, events, form responses, alumni surfaces, payments, and event form setup.
- It fetched events, dues, optional hackathon history, and ensured event forms as part of dashboard render.
- It used several page/card animation classes.
- No reusable `useMember` hook centralized current-member loading and no-member redirect behavior.

Legacy files:

- `legacy/apps/blade/src/app/dashboard/page.tsx`
- `legacy/apps/blade/src/app/_components/dashboard/member-dashboard/member-dashboard.tsx`

### 11. Design System And Frontend Guidance

Current behavior:

- `apps/blade/DESIGN_SYSTEM.md` documents Blade's visual language and current dashboard surface hierarchy.
- Frontend agent guidance for Codex, Claude, and Cursor now points at this design system.
- Current member dashboard encodes the lighter top-level panel and darker nested surface convention.

Primary files:

- `apps/blade/DESIGN_SYSTEM.md`
- `AGENTS.md`
- `docs/agentic-development/frontend-design-skill.md`
- `.claude/skills/frontend-design/SKILL.md`
- `.cursor/rules/frontend-design.mdc`

Legacy behavior:

- Styling existed through Tailwind/shadcn primitives and local conventions, but there was not a single Blade design-system document wired into agent/provider instructions.
- Layout/styling decisions were more component-local.

## Most Important Architectural Differences

### 1. Signup Is Now A Form Response With A Durable Callback

Current approach:

- `forms.createResponse` owns response validation, persistence, and callback execution.
- Member creation is a callback registered by server config.
- `FormResponse` insert and `Member` insert share one transaction.

Legacy approach:

- Member signup directly called `member.createMember`.
- Generic form callbacks were fired after client-side success and could fail after the response was already saved.

Why it matters:

- Correctness is better now. There is no "successful member signup form response but no member profile" state for the member signup path.
- The cost is slightly more server work during submission because callbacks are synchronous, but that cost buys a much clearer failure model.

### 2. Member Signup Is Code-Owned But Shaped Like The Existing Forms System

Current approach:

- The member signup definition is in validators/code and upserted into the existing form tables.
- It uses `FormsSchemas`, `FormResponse`, and `TrpcFormConnection`.

Legacy approach:

- Member signup bypassed the forms system entirely.
- Admin-created generic forms had their own flow, but onboarding did not use it.

Why it matters:

- This is a practical bridge. The form is not admin-editable yet, but it exercises the same response/callback architecture intended for forms.
- Later admin support can replace hardcoded config without changing the user-facing submit contract.

### 3. Validation Moved From Component-Local To Shared Package Boundaries

Current approach:

- Generic validators are reusable.
- Member validators are named by domain and imported by API/UI.
- Field metadata drives UI and callback mapping.

Legacy approach:

- Member application and member settings duplicated validators inline.
- Age, URL, file, graduation, and base64 handling were repeated.

Why it matters:

- Readability is better in the current feature because the form component mostly renders fields and handles UI state.
- Maintenance is better because changing a member field now starts in one field definition and one schema rather than two large forms plus API assumptions.

### 4. Routers Are Smaller And More Descriptive

Current approach:

- `memberRouter` exposes `getMember` and `createMember`.
- `formsRouter` exposes `getForm` and `createResponse`.
- `resumeRouter` and `profilePictureRouter` each own their own narrow upload/save/get surface.
- Shared behavior lives in utilities only where it is genuinely reused or cross-cutting.

Legacy approach:

- `memberRouter` mixed onboarding, update, delete, admin list/search/counts, events, dues-related dashboard reads, company side effects, QR generation, and Discord logging.
- `guildRouter` mixed public Guild reads, team roster logic, resume access, and profile-picture upload.
- `formsRouter` mixed admin form CRUD, connections, response create/edit/read/export, media, and access checks.

Why it matters:

- Current routers are easier to scan and safer to extend.
- The tradeoff is more files, but the file boundaries map better to behavior.

### 5. Upload Persistence Uses Object Names, Not Public URLs

Current approach:

- Resume and profile-picture upload APIs return object names.
- Saved dashboard previews use temporary signed URLs.
- Object-name ownership checks are enforced before saving and before signed URL generation.

Legacy approach:

- Resume already used object names and signed URLs.
- Profile pictures returned public URLs from the `guild` router.

Why it matters:

- The current profile-picture model is more private and consistent with resume storage.
- It also keeps public display concerns separate from upload persistence.
- The old profile-picture flow was simpler to render publicly, but it made persistence and public access the same value.

### 6. Dashboard Scope Is Much Smaller

Current approach:

- Dashboard is narrowly focused on the first member flow: profile summary, Guild card, resume, and profile picture.

Legacy approach:

- Dashboard bundled membership, dues, events, points, forms, alumni, donation/payment, and event form setup.

Why it matters:

- Current dashboard is faster and easier to reason about because it fetches much less.
- Legacy dashboard was useful as a mature product surface, but it was too broad for a first Reforge slice.

### 7. Guild Is Conceptually Separated Without A Table Split

Current approach:

- `GuildProfile` is a type boundary.
- Persistence remains on `Member`.

Legacy approach:

- Guild fields lived directly on `Member` with public Guild reads in `guildRouter`.

Why it matters:

- Current code improves readability without taking on a migration/data-integrity risk.
- A later table split can happen when the domain is clearer.

### 8. UI State Is More Explicit

Current approach:

- `useMember` centralizes current-member fetch, unauthenticated redirect, and authenticated-no-member redirect behavior.
- Dashboard has shape-matching skeletons and generic error text.
- Resume/profile-picture preview state uses object URLs with cleanup.

Legacy approach:

- Member state branching was scattered across server pages, settings pages, and dashboard components.
- Generic form UI had animation-heavy transitions and success states decoupled from callback success.

Why it matters:

- Current UI state is easier to reuse and test.
- There is less chance of tRPC internal data leaking into user-facing errors.

## Efficiency Notes

Better now:

- The initial dashboard does far fewer server reads than legacy. It does not fetch dues, events, past hackathons, points, forms, or run event form setup.
- Resume/profile-picture signed URL fetches are deferred until needed.
- The member route surface is smaller, so there is less unrelated code loaded into the mental path for this feature.

Costs introduced:

- `forms.getForm` upserts the code-owned form definition. That is acceptable for this bridge, but it is still work on read.
- `forms.createResponse` runs callbacks synchronously in the transaction. This is slower than background callback dispatch, but much more correct for member creation.
- Uploads still send base64 through tRPC. That is inherited from legacy and is not the most efficient upload path.
- The current tRPC route has a 4MB request body guard while resumes are allowed up to 5MB before base64 expansion. That mismatch can reject valid advertised resumes and should be fixed before calling the upload path production-ready.

## Readability Notes

Better now:

- The current feature has a clearer "where does this live?" answer:
  - validators define field shape and metadata
  - forms manager handles generic form response mechanics
  - member profile utility handles member insertion
  - resume/profile-picture utilities handle storage and security
  - Blade components handle presentation and local upload preview state
- The form renderer reads as a renderer of `memberSignupFields`, not as the source of truth for every member rule.
- The dashboard now has named reusable surface classes for the panel hierarchy.

Still worth watching:

- `member-signup-form.tsx` is still large because it owns a dynamic form renderer plus upload controls. It is not as tangled as legacy, but it is the next likely extraction candidate if more form field kinds are added.
- `json-schema-to-zod` plus `new Function` remains a trusted-schema mechanism. It existed in legacy too, but the current manager should keep that trust boundary explicit.
- The `resumeUrl` and `profilePictureUrl` column names still say "URL" while current values are object names. That is a schema legacy mismatch reviewers should keep in mind.

## Maintainability Notes

Better now:

- Adding/removing member signup fields mostly starts in `packages/validators/src/member.ts`.
- The callback mapping is explicit and server-owned.
- Member creation semantics are shared between direct tRPC and form callback paths.
- Resume and profile-picture storage are narrow utility modules instead of inline UI/router behavior.
- Design-system guidance is documented and provider-wired.

Known gaps:

- `Member.userId` is not schema-unique. The API checks for existing members, but a future DB hardening slice should consider a unique constraint if production data allows it.
- Upload cleanup is incomplete. Resume cleanup utility exists, but current save/create paths do not call it; profile-picture cleanup is not implemented in the new utility. Failed signup after upload can leave orphaned objects.
- Company side effects from legacy (`OtherCompanies`) are not included in the first slice.
- QR generation, Discord logging, dues, event data, admin member management, public Guild directory behavior, and full settings/profile editing are intentionally deferred.
- The current member dashboard can update resume and profile picture, but not all core member or Guild text fields yet.

## Highest-Signal Review Questions

1. Are we comfortable with code-owned form upsert on `forms.getForm`, or should code-owned form prep move to an explicit bootstrap/setup step later?
2. Should `forms.createResponse` keep synchronous transactional callbacks for all connected forms, or should only selected callbacks be marked transaction-critical?
3. Should `Member.userId` become unique before this flow ships broadly?
4. Should the upload APIs move away from base64/tRPC to direct presigned uploads before production?
5. Should current `Member.resumeUrl` and `Member.profilePictureUrl` values be renamed in a future migration to clarify that they now store object names?
6. Should cleanup run immediately after resume/profile-picture replace/clear, or be delegated to a scheduled object janitor?

## Bottom Line

The current approach is a better first Reforge slice than the legacy approach because it is narrower, more durable, and easier to extend. The most important architectural improvement is that member signup now uses the generic form-response path with transactional callback semantics. The most important inherited risk is upload transport/storage cleanup: base64 uploads are inefficient, the tRPC size guard is mismatched with the resume limit, and uploaded objects can be orphaned when the final signup fails or a dashboard upload is replaced/cleared.
