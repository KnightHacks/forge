# Technical requirements

Filter the hacker itinerary response query in `packages/api/src/utils/project-claims/itinerary.ts` by `ProjectEvaluationResponse.isPublic = true`, alongside the existing eligible evaluation IDs. Apply visibility before returning labels or values; frontend hiding is insufficient.

Preserve existing project ownership, completed member-evaluation, publication, emergency-mode, ordering, numeric-score and anonymous-identity behavior. Leave organizer/judge reads and stored responses unchanged. No schema migration, environment variable, dependency, wire-shape or React changes.
