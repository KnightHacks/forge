# Hacker Dashboard Live Information Test Cases

## Cases derived from the user's request

- Starting event is visible at its exact start; ending event disappears at its exact end.
- Simultaneous and overnight events work across time-zone offsets; past/future/invalid events are excluded.
- Empty schedule clearly says no events are happening now. Loading and errors must not claim there are no events.
- Non-checked-in users cannot issue schedule reads through this component.
- Checked-in hackers can replace a résumé during the event and just before its end; changes lock at and after the end.
- Ineligible application statuses remain locked.
- Existing file-size, PDF validation and idempotency are preserved.
- Desktop and mobile views expose useful content without nested boxes or overflow.
- Emergency and incident contacts have correct labels and tel/mailto links.

## Placement

2026 current-events.test.ts and existing API resume-policy.test.ts. Browser verification uses the existing local sample dashboard; do not alter another thread's scenario. Production storage is not exercised without a suitable isolated integration environment.
