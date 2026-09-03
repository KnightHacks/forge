# Blade Refinements Spec

Status: Complete — approved for implementation

## User-facing purpose

Blade should feel like one coherent Knight Hacks product rather than a collection
of admin pages and a separate mobile member experience. Navigation should be
deliberate, compact, and understandable; member pages should prioritize the next
useful action; admin pages should spend their space on the actual workspace; and
common failures should explain the real problem without disrupting the user.

This refinement slice also closes several concrete production defects, improves
issue collaboration and attribution, adds managed screenshots to issue
descriptions, and completes the Forms presentation model with a top banner image.

## Users / actors

- Ordinary authenticated members, including dues-paid and unpaid members.
- Members completing initial signup or editing an existing profile.
- Administrators with one or more Blade capabilities.
- Officers with access to all administration destinations.
- Form editors and authenticated form respondents.
- Issue readers, editors, assignees, and Discord reminder recipients.
- System actors represented in issue history or the Admin log.
- Unauthenticated visitors to the public Blade landing page.

## User-visible interface

### Public landing and account chrome

- `/` remains the public Blade landing page whether or not the visitor is
  signed in. Its primary call to action adapts to the session: sign in when
  unauthenticated and go to the member dashboard when authenticated.
- An ordinary member who has only Dashboard and Settings does not see a sidebar.
  The authenticated chrome shows a Settings cog and Sign out together at the
  top right.
- The product mark remains a recognizable route back to the public landing page.

### Administrator navigation

- Desktop administration uses a compact icon rail with an opener in the top-left
  corner. Hover and focus do not expand it.
- Every collapsed icon is directly clickable and has an accessible name and
  tooltip, so a user who recognizes it can navigate without opening the rail.
- Clicking the opener reveals labels and section headings. Selecting any
  destination closes the expanded rail after navigation.
- Mobile retains its current drawer behavior and closes after a selection.
- External destinations use a consistent external-link marker and accessible
  wording. This includes Guild in navigation and outbound Guild/social/profile
  actions.
- Dashboard remains first and ungrouped. The administration map is:
  - **Club:** Analytics, Members, Alumni, Companies, Events, and Event Check-in.
  - **Team:** Issues, Forms, Email, Roles, Discord archive, and Admin logs.
  - **Hackathon:** Hackathons, Hackers, Hackathon Events, and Hackathon Check-in.
  - **External:** Guild.
- Settings and Sign out remain account utilities rather than administration
  destinations.

### Administration page hierarchy

- A top-level admin page shows its title and relevant actions without the
  visible purple eyebrow or a permanently visible descriptive paragraph.
- A title-adjacent accessible information control preserves useful page context
  by placing the current page description in a tooltip. The former eyebrow is
  not carried into the tooltip.
- Loading states do not reserve vertical space for the removed lines.
- Configuration panels remove subtitles that merely repeat the panel title or
  available choices. Copy that explains consequences, permissions, payment,
  deletion, or another non-obvious fact stays visible.

### Member dashboard and Guild

- Mobile and desktop present the same member sections, order, labels, and
  available actions. Layout may reflow, but neither viewport is a separate
  product.
- Guild remains a prominent, top-level part of the dashboard. Profile-picture,
  resume, visibility, and Guild preference controls are not moved away solely
  because they mutate data.
- The Guild card briefly explains that Guild is Knight Hacks' public member
  directory/profile, clearly distinguishes public Guild content from private
  Blade content, and marks the public Guild profile action as external.
- Avatar, visibility, name, tagline, company, links, resume controls, and empty
  states remain aligned with missing as well as populated data.
- The dashboard includes a compact **Check in** surface with a **View QR code**
  action on both mobile and desktop.
- An unpaid member sees a prominent dues banner near the top with a clear
  payment action.
- A paid member does not see the dues banner. A compact green paid badge appears
  beside `Welcome, <first name>` and its hover/focus tooltip confirms that dues
  are paid.
- Previous forms remains reachable at the bottom of the dashboard as a small,
  low-emphasis history action rather than a primary tile.

### Profile and career feedback

- Uploading or replacing a resume during signup or from an existing profile
  confirms success without automatically opening the document viewer.
- The success state offers an explicit **View** action.
- Removing a saved profile picture requires confirmation. Cancelling keeps the
  picture and its saved state unchanged.
- Employment editing marks required fields, associates an error with the
  precise employment entry and field, and focuses or scrolls to the first
  problem.
- Legacy employment records still receive the intentional migration/confirmation
  guidance, but a missing position title, experience type, company, or status is
  never mislabeled as a different error.

### Issues and audit identity

- Typing in admin member search remains focused while results and URL state
  update.
- Filtering Issues by assignee loads a valid result or a truthful empty state;
  it never replaces the workspace with the generic "Issues could not be loaded"
  failure for a valid selection.
- Author-entered line breaks remain visible in issue description preview and
  detail views while Markdown continues to work.
- Issue editors can add managed screenshot images to a description through a
  file picker, clipboard paste, or drag and drop. The image is inserted at the
  description cursor.
- Managed issue images accept PNG, JPEG, WebP, and GIF files up to 10 MB each.
  An issue retains at most 10 managed images. Animated GIFs are allowed and SVG
  is rejected.
- Uploaded issue images appear in preview and detail, follow issue access, have
  editable alternative text, and can be removed by an authorized editor.
- Issue history and Admin log surfaces prefer the linked member's current full
  name. If no linked Member profile can be resolved, they fall back to the saved
  Discord display name or username. Explicit system actors remain system actors.
- Existing history and log rows benefit from the same display rule; their saved
  historical snapshots are not rewritten.

### Issue reminders

- Every issue reminder presents the Blade destination as the linked issue
  title.
- When the issue has a Discord discussion thread, the title is followed by
  ` | Chat`, with **Chat** linked to that thread.
- Without a thread, only the linked title is shown. Mentions, reminder cadence,
  delivery idempotency, and message safety remain unchanged.

### Forms presentation

- Every respondent question prompt appears inside its bordered question card.
  Short and multi-line prompts use the same in-card treatment, wrap naturally,
  and remain clear of the card border at supported widths.
- Existing form instruction blocks continue to support text, uploaded images,
  and browser-playable uploaded video. Editors can see that capability, upload
  media, remove it, and verify its respondent presentation without needing
  hidden knowledge of the builder.
- A form editor can upload, replace, or remove one banner image for a form.
- The banner appears once at the top of the respondent experience, above the
  form title/description/instructions, in a responsive 4:1 frame with `cover`
  cropping. The builder provides crop guidance, preview, and editable alt text.
- Draft preview and the published respondent view use the same banner behavior.
- Banner and instruction media are visible only to actors allowed to view that
  form; possession of an object URL does not bypass form access.

### Responsive and chart readability

- Member surfaces remain usable at 320 px, common mobile widths, intermediate
  desktop widths, and full desktop widths in Chromium-family browsers.
- Long member names, taglines, companies, URLs, event names, and empty-state
  sentences wrap or truncate intentionally without being clipped.
- Nearby current/prior deadline labels on hackathon comparison charts remain
  distinguishable. The existing textual/table alternative remains available.

## Scope

### In scope

- Public landing behavior for authenticated visitors.
- Member-only header without a sidebar; explicit desktop admin rail behavior;
  grouped admin information architecture; mobile close-on-select preservation.
- Central admin header compaction and repetitive configuration-copy cleanup.
- Unified member dashboard hierarchy, Guild explanation, external-link cues,
  check-in surface, paid/unpaid dues treatment, and demoted form history.
- Resume success flow, photo-removal confirmation, employment validation, member
  search focus, issue-assignee failure, issue newlines, responsive overflow, and
  analytics label collisions.
- Managed images in issue descriptions.
- Existing form image/video instruction support verification and discoverability.
- One managed top-of-form banner image.
- Respondent question-prompt alignment for short and multi-line labels.
- Issue reminder `Title | Chat` presentation.
- Member-full-name resolution in issue history and Admin logs with Discord
  fallback.

### Out of scope

- A Knight Hacks member-benefits page or benefits content.
- Moving all Guild/profile mutations into Settings or making the dashboard
  profile read-only.
- Replacing Blade analytics with Grafana or adding observability infrastructure.
- Uploaded video in issue descriptions; arbitrary issue file attachments beyond
  the managed image formats approved for this slice.
- Anonymous or public Forms behavior beyond the existing Forms platform.
- A new open-forms directory.
- Redesigning Discord reminder cadence, mentions, or delivery infrastructure.
- A browser-specific Zen workaround when standards-compliant responsive behavior
  is already correct; Chrome and Zen reports are both valid reproduction inputs.

## Vocabulary

- `Blade`: Knight Hacks' member and administration product.
- `Guild`: Knight Hacks' public member directory and public-profile surface,
  distinct from private Blade member data.
- `Icon rail`: the collapsed desktop administration navigation.
- `Instruction block`: ordered form guidance containing text, an image, or a
  browser-playable video.
- `Form banner`: one editor-managed image displayed above a form's respondent
  content.
- `Managed issue image`: an uploaded image owned and authorized by the issue
  system rather than a permanently public third-party URL.
- `Member full name`: the linked Member profile's first and last name, not the
  authentication provider/Discord username.
- `Saved actor snapshot`: the immutable fallback label recorded when a history
  or audit event was written.

## Acceptance criteria

- Ordinary members can reach Dashboard, Settings, Sign out, and the public
  landing page without seeing an otherwise two-item sidebar.
- Admins can activate collapsed icons directly, explicitly expand the rail,
  understand grouped destinations, and observe it close after selection without
  hover causing layout changes.
- Top-level admin workspaces reclaim the eyebrow/description height while useful
  context remains keyboard- and screen-reader-accessible.
- Mobile and desktop member dashboards expose the same hierarchy and actions,
  with Guild prominent and plainly defined.
- Unpaid members receive the prominent payment CTA; paid members see only the
  compact paid badge beside their welcome name.
- Resume uploads across signup and existing-member flows confirm success and wait
  for the user to select View; profile image deletion can be cancelled safely.
- Search, issue filtering, employment validation, Markdown line breaks,
  responsive content, and comparison-chart labels pass their concrete regression
  cases.
- Authorized issue editors can upload, describe, render, and remove managed
  screenshots without exposing them to unauthorized users.
- Issue reminders render linked `Title | Chat` when a Discord thread exists and
  linked `Title` alone otherwise.
- Issue history and Admin logs show current member full names when resolvable and
  truthful fallbacks otherwise, including for pre-existing rows.
- Existing form image/video instructions remain operational and understandable;
  a banner image can be managed and appears correctly in preview and response
  views.
- Respondent question prompts render inside their question cards without
  extending above or being crossed by the card border, including when they wrap
  across multiple lines.

## Open questions

- None. The product bundle is approved for implementation.
