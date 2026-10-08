# Email Delivery Reliability Spec

Status: Implementation authorized by the request to fix on `emailfix` and test delivery.

## Purpose and scope

Officers need email campaigns to retain every approved recipient and show when messages were not sent. Applicants must not lose status emails when several changes are processed together.

Preserve the existing composer, confirmation, suppression, and permissions. Fix subscriber-update races, incomplete/paused delivery reporting, anomalous send counts, bounce counts, and recovery after provider polling errors. A completed campaign means the provider reports the expected messages accepted; it does not establish inbox delivery.

## Acceptance criteria

- Concurrent campaigns retain each other's recipient data and audience membership.
- Partial, paused, and over-counted campaigns display an actionable failure instead of success.
- Once delivery may have started, an officer cannot retry the whole campaign.
- A temporary status-read failure continues reconciliation without recreating a campaign.
- Live tests target only the explicitly selected addresses. The first pair used directors@knighthacks.org; the larger batch uses the user-selected replacement mailbox. The user asked to leave the directors test-list unsubscribe intact.
- All Forge-authored HTML campaigns retain their design without Listmonk's extra white card, gray background, or padded gutters. Unsubscribe, browser-view links, personalization, and tracking remain available. The user authorized one additional visual test to directors@knighthacks.org without changing its subscription state.

## Exclusions and open questions

No automatic replay of historical campaigns, schema/dependency changes, SMTP account changes, or broad audience sends. Gmail's exact reason for the observed temporary errors remains unconfirmed. Inbox arrival requires recipient confirmation.
