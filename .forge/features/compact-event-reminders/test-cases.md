# Compact Event Reminders Test Cases

Tests extend `apps/cron/src/tests/event-reminders.test.ts` using an injected
sender. Existing window, eligibility, empty-result, and DST cases remain.

## TC-001: Compact daily schedule

Given three same-day events, execute the reminder. Expect one dated embed with
linked names, time ranges, locations, and tags in order. Omit descriptions,
thumbnails, and field grids. Keep one role ping and the exact original daily introduction and footer.

## TC-002: Busy day

Given 60 eligible same-day events, expect every link exactly once, in order,
at most eight rows per card, and dated continuations. No description exceeds
4096 characters or message exceeds 6000 embed characters. Send the introduction
and footer once.

## TC-003: Long and formatted labels

Given at least three events with long names, locations, tags, emoji, and Markdown, expect escaped,
single-line labels with ellipses and intact Unicode and event links. Split
between rows when the character limit is reached before eight events.

## TC-004: Sunday regression

Given two Sunday candidates on different weekdays, expect the original full
cards and weekday headings, the exact original Sunday introduction/week range,
and one everyone ping. Preserve existing
daily windows, excluded tags, empty results, and spring/fall DST behavior.

## TC-005: Small schedules retain details

Given one or two eligible events plus candidates outside the reminder windows,
expect the exact original card fields, description, thumbnail, event title/link,
and standalone section heading. Ineligible candidates do not trigger compact mode.

## TC-006: Count across the entire reminder

Given three eligible events spread across Today, Tomorrow, and Next Week, expect
three compact dated cards. Do not choose the style separately for each section.

## Visual review

Inspect desktop and 320px local previews with typical, long-label, and 60-event
data. Check wrapping, date hierarchy, links, continuation, and horizontal overflow.
