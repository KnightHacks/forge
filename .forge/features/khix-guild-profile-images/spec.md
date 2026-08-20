# KnightHacks IX Guild Profile Images Spec

Status: Approved

## User-facing purpose

Visitors to the KnightHacks IX website should see the current Guild profile
pictures for featured team members. Estefanie Parra's current Guild picture
must render instead of a broken image, and Lena Tran must no longer appear in
the IX featured team display.

## Users / actors

- Public visitors to `2026.knighthacks.org`.
- Knight Hacks organizers reviewing the IX team section.

## User-visible interface

The existing KnightHacks IX team cascade keeps its current layout, role labels,
selection behavior, and LinkedIn links. Available Guild portraits render in the
existing circular avatars; missing or unavailable portraits continue to fall
back to initials.

## Scope

### In scope

- Repair current Guild profile pictures in the IX team cascade.
- Show Estefanie Parra's current Guild portrait.
- Remove Lena Tran from the IX featured designers.

### Out of scope

- Removing or modifying Lena Tran's Guild profile or club roles.
- Changing Guild visibility, profile-upload behavior, team membership, or IX styling.

## Vocabulary

- `Guild profile picture`: A public portrait stored by Guild and exposed through a temporary signed URL.
- `featured designer`: A design-team member explicitly selected for the IX team cascade.

## Acceptance criteria

- Estefanie Parra's portrait loads successfully on the IX team section.
- Other available Guild portraits continue to load.
- Lena Tran is absent from the IX team cascade.
- Missing or unavailable pictures display initials without breaking the roster.
- Names, roles, selection behavior, and LinkedIn links remain functional.

## Open questions

- None. The human confirmed IX-only removal and branch-plus-PR delivery on 2026-08-20.
