# Technical scope

Add survey1 and survey2 to hacker.get under its existing read permission. Prefer the selected HackerAttendee answers, falling back to legacy Hacker answers only when null. Preserve empty strings. Do not expand roster payloads. Render plain text in a full-width DetailSection with a keyboard-focusable bounded scroll region, wrapping long strings and preserving whitespace. No schema, permission, dependency, or mutation changes.
