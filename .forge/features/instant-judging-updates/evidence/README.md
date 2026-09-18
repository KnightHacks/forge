# Judging live-update evidence

Recorded September 16, 2026 using two independent Chromium sessions against a
local Next.js development server and disposable PostgreSQL database. All people,
projects, and room assignments are synthetic. The officer uses the real Blade
controls while the other browser stays on the judge page.

| Action                                        | Main at 361d10a5 | SSE branch |
| --------------------------------------------- | ---------------: | ---------: |
| Publish announcement → visible to judge       |         29.987 s |    0.973 s |
| Save reassignment → new room visible          |          0.939 s |    0.864 s |
| Restore network → missed announcement visible |     Not recorded |    0.214 s |

These are single local observations, not a benchmark or production latency
promise. The baseline reassignment happened just before its next polling refresh,
so that baseline is already quick. The announcement trial demonstrates the delay
from polling. Both recordings use the same fixture and actions.

## Videos and screenshots

The PR description embeds the before/after recordings as GIF animations, with
the timing table, result screenshots, and reproduction procedure inline. The GIFs
are 1280 pixels wide at five frames per second and preserve normal playback speed
(duration rounded by less than one frame). The MP4s below retain full resolution.

- [Before: organizer and judge](before.mp4)
- [After: organizer and judge, including recovery](after.mp4)
- Original videos: [before organizer](before/organizer.webm),
  [before judge](before/judge.webm), [after organizer](after/organizer.webm),
  [after judge](after/judge.webm).
- Judge screenshots: [announcement](after/announcement.png),
  [reassignment](after/reassignment.png), [recovery](after/reconnected.png).

The split-screen videos play the recorded actions and waits at normal speed.
After visual review, we trimmed 27.5 seconds of startup from Before and 2.5 seconds
from After, added captions identifying the actions and simulated network outage,
and appended a three-second announcement screenshot labeled as a still image.
The timed publish-to-visible sequences remain intact. Original WebM recordings
are unchanged. The two browser contexts were recorded independently; exact latency
comes from the timestamps below, not from comparing the video clocks.

## Measurement and reproduction

1. Use an active hackathon with judging open, a rubric, two staffed rooms, and a
   future Aurora appointment in ENG 101. Sign an officer and a judge into separate
   browser contexts. Keep the second room's judge session current.
2. Open the officer's Rooms tab and the judge's Projects page. Browse all rooms so
   Aurora remains visible after reassignment. Wait for the initial announcements
   query to finish.
3. Publish “Judges: please check the updated room assignment for Aurora.” Record
   button-click time and the time that exact text becomes visible to the judge.
4. Dismiss the judge's banner. In Schedule, reassign Aurora to ENG 102. Record save
   click time and the time ENG 102 appears in the judge's Aurora row.
5. For recovery, put the judge context offline with Playwright, replace the
   announcement from the officer context, wait at least 20 seconds offline, then
   restore networking. Observe the new announcement without reloading the page.

[Before timestamps](before/timings.json) show no SSE connections.
[After timestamps](after/timings.json) include actual native EventSource opens
and messages, observed without substituting the transport. The announcement
notification arrived 223 ms after Publish; the reassignment notification arrived
151 ms after Save. Rendering/refetch then produced the visible timings above.
The recovery run opened a new stream and caught up on its initial invalidation.

[Endpoint response](sse-response.json) confirms HTTP 200, `text/event-stream`,
`X-Accel-Buffering: no`, and a real initial invalidation.

## Limits

This ran on loopback HTTP, not the production HTTPS proxy. Production must support
unbuffered streaming and a session-capable PostgreSQL connection. Discord was
intentionally disconnected in the fixture. Deadline/recovery polling remains.
The temporary database, baseline worktree, and capture helpers were removed after
verification; source videos, screenshots, timestamps, and this procedure remain.
