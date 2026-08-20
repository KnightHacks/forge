# KnightHacks IX Guild Profile Images Test Cases

Status: Approved

## Scope

Tests cover public Guild picture resolution, roster URL safety, and the KHIX
featured-designer filter. They do not change or test production data, Guild
membership, uploads, or styling.

## Test placement plan

- `packages/api`: Guild profile-picture and club-roster unit tests.
- `apps/khix`: team-roster filtering unit test.
- Repository validation and Blade/KHIX builds before commit.

## Test cases

### TC-001: Current Guild object name becomes a signed public URL

Setup:

- A visible member has a user-owned object-name profile-picture reference.

Action:

- The public picture resolver or club roster reads the member.

Expected observations:

- MinIO receives the validated object name and the response contains the signed URL, never the raw key.

### TC-002: Legacy Guild URL remains compatible

Setup:

- A visible member has a legacy absolute MinIO profile-picture URL owned by that member.

Action:

- The public picture resolver reads the member.

Expected observations:

- The legacy URL is reduced to its owned object name and re-signed through the current Guild storage client.

### TC-003: KHIX removes Lena only from featured designers

Setup:

- The source roster includes officers, directors, organizers, other featured designers, and Lena Tran's design member ID.

Action:

- KHIX maps the source roster into team cascade groups.

Expected observations:

- Lena is absent, the remaining featured designers are present, and all non-designer groups are unchanged.

## Negative / regression cases

### TC-NEG-001: Invalid or unowned reference fails closed

Setup:

- A profile-picture reference is malformed or belongs to another user.

Action:

- A public Guild profile or roster response is generated.

Expected observations:

- No storage signing occurs and the picture field is null, allowing clients to render initials.

### TC-NEG-002: Storage signing failure preserves the roster

Setup:

- A valid owned profile-picture reference exists, but MinIO signing fails.

Action:

- A public Guild profile or roster response is generated.

Expected observations:

- The picture field is null and the public response remains available without leaking the raw reference.

## Open questions

- None.
