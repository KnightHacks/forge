# Compact Event Reminders Test Cases

Tests extend `apps/cron/src/tests/event-reminders.test.ts` using an injected
sender. Existing window, eligibility, empty-result, and DST cases remain.

## TC-001: Compact daily schedule

Given two same-day events, execute the reminder. Expect one dated embed with
linked names, time ranges, locations, and tags in order. Omit descriptions,
thumbnails, and field grids. Keep one role ping and the exact original daily introduction and footer.

## TC-002: Busy day

Given 60 eligible same-day events, expect every link exactly once, in order,
at most eight rows per card, and dated continuations. No description exceeds
4096 characters or message exceeds 6000 embed characters. Send the introduction
and footer once.

## TC-003: Long and formatted labels

Given long names, locations, tags, emoji, and Markdown, expect escaped,
single-line labels with ellipses and intact Unicode and event links. Split
between rows when the character limit is reached before eight events.

## TC-004: Sunday regression

Given Sunday candidates on different weekdays, expect separate dated weekday
cards, the exact original Sunday introduction/week range, and one everyone ping. Preserve existing
daily windows, excluded tags, empty results, and spring/fall DST behavior.

## Visual review

Inspect desktop and 320px local previews with typical, long-label, and 60-event
data. Check wrapping, date hierarchy, links, continuation, and horizontal overflow.
