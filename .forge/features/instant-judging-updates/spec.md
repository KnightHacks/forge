# Instant Judging Updates

Status: Implemented and verified locally; production streaming check remains.

Judges and officers should see committed announcement, room assignment, schedule,
and scoring changes as they happen, without waiting for a polling interval.
The user confirmed immediate updates and requested before/after videos for PR proof.

Scope: Blade judging pages and their API writes. Existing access rules, input
forms, navigation, and score ownership remain the contract. Disconnected browsers
catch up when they reconnect. Other apps and hacker portal live updates are out
of scope.

Acceptance: a connected judge receives announcements and schedule repairs without
waiting for the current 15/30-second intervals. Record elapsed time in separate
organizer/judge browser sessions. No promise of zero network or rendering latency.
Refetch after reconnect, preserve unsaved answers, and stop delivery after access
revocation. Keep current time-based refreshes for deadlines and recovery.
