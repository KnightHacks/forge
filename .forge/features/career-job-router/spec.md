# Career Job Router Spec

Status: Agreed with Kevin on 2026-11-16. Dev-lead review happens on the PR.

## User-facing purpose

Members get one place in Blade to explore scraped job listings, track their own
applications with dates, and find other members going through the same hiring
process. This slice (#651, part of #633) provides the data those pages need; the
pages themselves are #655 and #656.

## Users / actors

- Members: signed-in users with a member profile.
- Signed-in users without a member profile: no access.
- Officers: unchanged here. They already manage Career Discord channels and
  roles through the existing platform configuration console (#648).

## User-visible interface

No pages in this slice. It supplies:

- Explore: search, sort and filter listings by track, company, category,
  location and posted date. Closed listings are hidden unless asked for.
- A job view: listing details, where it was found, members in process for it,
  and the viewer's own progress.
- A company view: that company's listings, each with its members in process.
- People in process: members by company, role and stage.
- My applications: the member's own tracker with notes, visibility and a dated
  timeline.

## Scope

### In scope

- Save a listing, set stage, optional round and optional interview label,
  update or remove it.
- An optional date for each stage change, so progress logged later is dated
  correctly (applied 10/22, interview 11/01). Defaults to the time of saving and
  cannot be in the future.
- Community visibility by default, with a private setting.

### Out of scope

- Ping preferences and digest opt-ins. They follow in a second PR once the
  matching services in #650 merge.
- Editing or deleting individual timeline entries.
- Blade pages, cron, ingestion and Discord delivery.

## Vocabulary

- `community application`: one other signed-in members can see.
- `private application`: one only its owner can see.
- `progress`: a change to stage, round or interview label.

## Acceptance criteria

- A user without a member profile cannot read or change anything.
- Other members see a community application's name, picture, Discord username,
  stage, round and interview label, and never its notes.
- A private application appears in no view except its owner's.
- A `saved` application (bookmarked, not yet applied) appears in no view except
  its owner's, whatever its visibility.
- Each progress change adds one dated timeline entry; editing notes or
  visibility adds none.
- A member can change or remove only their own applications.

## Open questions

- Location filters widen each other (a city or U.S. remote). Confirm with #655.
