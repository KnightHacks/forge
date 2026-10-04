# KHIX Map Location Links

People sharing event locations can link directly to a building or room, for
example `[HEC101](https://2026.knighthacks.org/map?location=HEC101)`.

- Accept the map's building abbreviations and three-digit rooms with optional
  letter suffixes, including compact, spaced, lowercase, and hyphenated forms.
- Open mapped rooms on their actual floor and highlight the destination.
- For an unmapped room, show its building and explain the missing room plan.
  HEC currently has no indoor plan.
- Keep the existing sign-in requirement and preserve the destination through
  sign-in. Opening a link does not set the visitor's own location.
- A missing location opens the usual overview; invalid input shows the overview
  with an explanatory message. Normal map interaction remains available.

This change adds link consumption. Generating links from map controls, new floor
plans, and public access are outside scope.
