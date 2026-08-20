# KnightHacks IX Guild Profile Images SRD

Status: Approved

## Technical purpose

Ensure Guild public roster responses resolve both legacy absolute profile-picture
URLs and current object-name references into signed public URLs before clients
render them. Remove Lena Tran's ID from the KHIX featured-designer filter.

## Relevant principles

- Keep `apps/khix` a thin client of the `@forge/api` Guild capability.
- Preserve existing public tRPC contracts and app/package boundaries.
- Reuse current profile-picture ownership validation and MinIO signing.

## Access policy

`guild.getPublicClubTeamRoster` remains an unauthenticated public query and
returns only opted-in Guild profiles. No authenticated, officer, or admin
behavior changes.

## Architecture / data flow

`@forge/api` owns a shared public profile-picture resolver. Guild profile reads
and the public club roster use it to validate the stored reference against the
member's user ID and request a one-hour signed MinIO URL. KHIX continues to read
the roster over the existing Blade tRPC endpoint and uses initials when
`imageUrl` is null.

## tRPC/API behavior

`guild.getPublicClubTeamRoster` keeps its current input and output shape.
`PublicClubTeamMember.imageUrl` remains `string | null`, but non-null values are
public signed HTTPS URLs rather than database storage references. Invalid,
unowned, or un-signable references become null without failing the roster.

## Validation

No validator changes. Existing profile-picture ownership resolution remains the
authority for accepted legacy URLs and current object names.

## Data / migration / compatibility

No schema, migration, data, dependency, or environment changes. Blade must
deploy the API change and KHIX must deploy the featured-designer change. The
unchanged API shape makes either deployment order backward-compatible.

## Discord integration

No Discord roles, sync behavior, or Guild records are changed.

## Configurability review

Would this require a developer change next year?

- Answer: The public roster and pictures remain data-driven. The IX featured-designer shortlist is intentionally event-specific and already hard-coded in KHIX.
- If yes, why is hard-coding acceptable or what admin-configurable path is planned? Lena's removal changes only that existing IX-specific shortlist; no new configuration debt is introduced.

## React / frontend constraints

No component structure or styling changes. Preserve the existing client-side
roster loading, image component, initials fallback, and interaction behavior.

## Testing / verification strategy

- Unit-test public picture resolution for current object names, legacy URLs, invalid ownership, and signing failures.
- Unit-test roster preprocessing so raw references never reach `imageUrl`.
- Unit-test KHIX featured designer filtering with Lena present in the source roster.
- Run targeted API/KHIX tests, affected builds, React analysis, and repository format/lint/typecheck gates.

## Open questions

- None.
