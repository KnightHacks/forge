# Hacker Dashboard Live Information SRD

## Scope and architecture

Small isolated 2026 dashboard component plus a schedule hook and pure current-event filter. Reuse SDK schedule/public-hackathon queries, existing time formatting and theme tokens. Mount below the admission-pass content. Poll schedule changes once a minute and update the clock at event boundaries.

This follows Forge's thin-client/platform-service boundaries. Keep the independently testable time filter, UI, and backend deadline policy separate; no agent delegation in this side conversation.

## Access policy

Schedule requests remain checked-in-only through the SDK and server. Confirmed users see a check-in explanation. Contact information is static public information. Résumé writes remain authenticated, scoped, validated and idempotent. Denied/withdrawn applications stay locked.

## Résumé behavior

Use configured Hackathon.endDate instead of startDate in the server-side résumé policy and the 2026 dashboard eligibility state. Preserve the database clock, existing file validation, storage, auditing and command leases. Keep the current event's legacy hacker résumé pointer current for organizer downloads; do not rewrite a frozen application snapshot. Existing future application synchronization stays intact.

## Data and compatibility

No schemas, migrations, dependencies or environment changes. The Blade-hosted participant résumé API is the affected shared consumer, so check both API and Blade types. Other applications' profile-edit permissions remain unchanged.

## Contact sources

Verified 2026-10-05: https://www.police.ucf.edu/ and https://github.com/MLH/mlh-policies/blob/main/code-of-conduct.md. UCF: 911 emergency; 407-823-5555 non-emergency. MLH North America incident reporting: 409-202-6060, incidents@mlh.io. These are specific to this year's UCF event UI, not a new cross-year contact configuration system.

## Checks

Boundary tests for events and résumé end cutoff; app/API/Blade typechecks; scoped lint/format; React analysis; desktop/mobile screenshots. Any upload exercised against the local sample server is identified as a mock rather than proof of production object storage.
