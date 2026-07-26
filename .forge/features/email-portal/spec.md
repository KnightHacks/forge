# Email Portal Spec

Status: Approved

## User-facing purpose

Authorized administrators need one safe place in Blade to create expressive, reusable emails and send or schedule them to Knight Hacks audiences. The portal should make personalization, audience size, delivery state, and failures visible before and after a send so administrators do not need developer help or direct Listmonk access for routine announcements.

## Users / actors

- Email administrators: trusted officers or team members with access to author templates, compose messages, select audiences, and send or schedule emails.
- Recipients: current members, alumni, existing team-roster members, and hackers associated with a selected hackathon and application status.

## User-visible interface

The Blade admin area provides three connected workspaces:

### Templates

- Administrators can view, create, edit, preview, duplicate, publish, and archive reusable email templates.
- Code templates provide a TSX editor and rendered preview for expressive React Email layouts built from the supported email component set.
- Simpler visual templates may be created with a block editor.
- Templates support structured personalization fields and recipient-dependent content through supported merge, conditional, and repeated-content constructs.
- The editor shows which personalization fields a template requires and lets the administrator provide fallback content where appropriate.
- Published revisions remain stable so editing a template does not silently change an already scheduled email.

### Compose

- Administrators can compose an email from a published template or write a plain-text email.
- The composer includes the subject, content/template selection, audience selection, immediate-versus-scheduled delivery, rendered preview, and visible validation feedback.
- Compose is the default portal workspace. Unfinished compose fields are restored from versioned browser-local draft storage when navigation or template editing remounts the workspace, and the draft is cleared after successful confirmation.
- Built-in audiences include:
  - current, non-alumni members;
  - alumni;
  - members of the existing team roster;
  - all hackers for a selected hackathon; and
  - separate groups for each hacker status, labeled with the hackathon display name, such as `BloomKnights Confirmed` and `BloomKnights Withdrawn`.
- Multiple selected groups are combined and duplicate email addresses are collapsed.
- The selected audience expands into a searchable recipient list. Every eligible recipient starts selected, and the administrator can deselect individuals before previewing the final audience.
- The audience preview shows the final unique recipient count, exclusions, and personalization fields that are unavailable for some recipients.
- A confirmation dialog shows the final unique recipient count before either an immediate send or a scheduled send is accepted.
- Sending a test email is optional. The portal test button can only deliver to `directors@knighthacks.org`; the administrator cannot enter or select a different test address.

### Sends

- Administrators can see draft, scheduled, running, completed, cancelled, and failed sends.
- Scheduled sends can be cancelled before delivery begins.
- Each send shows its subject, template or content type, creator, audience summary, scheduled or sent time, final recipient count, delivery progress, and actionable failure state.
- The audience approved in the confirmation flow is frozen for the send. A recipient who later unsubscribes or becomes suppressed is removed before delivery, but newly matching recipients are not added.

## Scope

### In scope

- Reusable code-based and visual email templates.
- Template previews, structured personalization, fallbacks, publication, and revision history.
- Plain-text composition.
- Built-in current-member, alumni, team-roster, hackathon, and hackathon-status audiences.
- Audience deduplication, preview, and exact pre-send recipient counts.
- Immediate and scheduled bulk sends.
- Optional directors-only test sends.
- Send cancellation, progress, failure visibility, retry-aware delivery, and administrative history.
- Respecting recipient unsubscribe and suppression state for portal-created bulk sends.

### Out of scope

- Arbitrary SQL audience queries.
- Running unrestricted server, database, filesystem, network, or dependency-loading code from a template.
- Treating the existing MLH consent field as Knight Hacks email consent.
- Replacing existing application-triggered transactional emails, such as individual status notifications.
- Sending portal test-button emails to any address other than `directors@knighthacks.org`.

## Vocabulary

- `Template`: Reusable email content authored in code or the visual editor.
- `Published revision`: An immutable template version available to the composer and safe for scheduled sends.
- `Personalization field`: A named value that may be supplied by a recipient or audience context, such as first name, hackathon display name, or hacker status.
- `Audience`: One or more recipient groups selected for a send.
- `Audience preview`: The deduplicated count, exclusions, field coverage, and recipient sample calculated before confirmation.
- `Send`: An immediate or scheduled bulk email created in the portal. Listmonk may refer to this delivery unit as a campaign.
- `Test send`: An optional preview delivered only to `directors@knighthacks.org`.
- `Suppressed recipient`: A recipient who must not receive the portal send because of unsubscribe, blocklist, invalid-address, or related delivery state.

## Acceptance criteria

- An authorized administrator can author, save, preview, publish, list, duplicate, and archive an expressive code-based email template.
- An authorized administrator can create and use a simpler visual template without writing code.
- A code template can use supported React Email layout components and structured merge, conditional, and repeated-content constructs.
- The portal identifies required personalization fields and warns when the chosen audience cannot supply them for every recipient without a fallback.
- An administrator can compose either a templated email or a plain-text email.
- The audience picker exposes current members, alumni, the existing team roster, every role in `Roles`, every selectable hackathon, all hackers for that hackathon, and each supported hacker status for that hackathon.
- Selecting overlapping groups never sends more than once to the same normalized email address.
- An administrator can inspect every eligible recipient in the selected audience and deselect individuals before previewing.
- The audience preview and final confirmation dialog show the exact unique recipient count and relevant exclusions before accepting the send.
- An administrator can send immediately or select a future delivery time.
- A scheduled send uses the audience approved at confirmation, except that newly suppressed recipients are removed before delivery.
- An administrator can cancel a scheduled send before delivery begins and can see the resulting state.
- An administrator can review delivery progress and actionable failure information without opening Listmonk.
- An optional portal test-send action always targets exactly `directors@knighthacks.org` and offers no alternate recipient input.
- No local preview, retry, scheduled, or normal automated-suite path can deliver an email to another real address.
- Automated suites use fake delivery. Any separately authorized live automated integration test may target only `donotreply@knighthacks.org`.
- In `NODE_ENV=development`, live audience campaigns are restricted in the UI, API, current-role recheck, and provider boundary to Team members and explicit role audiences. `NODE_ENV=production` uses normal approved audiences, while `NODE_ENV=test` is network-free.
- Plain-text composition produces a real `text/plain` campaign without Listmonk's default HTML wrapper.
- Portal-created bulk sends honor unsubscribe and suppression state.
- Arbitrary SQL audience entry is not present in the portal.
