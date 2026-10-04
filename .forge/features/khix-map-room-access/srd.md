# KHIX Map Room Access SRD

## Architecture

Extend origin/khix-map, aligned with main. Blade owns organizer editing; KHIX owns geometry, room presentation, and map navigation. Shared stable building identities live in @forge/consts; validation lives in @forge/validators. Business reads/writes stay in @forge/api. @forge/db owns schema and migrations only.

## Persistence and interfaces

One approved HackathonMapConfiguration table with hackathonId primary/FK (cascade), restrictionsEnabled default false, typed JSON rooms [{buildingId, roomNumber, name}], and updatedAt. Missing rows read as disabled/empty. Normalize trimmed room numbers to uppercase; reject duplicate building/room entries. Validate optional names and known building identities. Save the whole list and toggle atomically under a hackathon row lock.

hackathon.get includes map configuration. hackathon.saveMapConfiguration uses the existing officer-only platform configuration gate and records an audit event in the same transaction. Authenticated participant getMapConfiguration reads only the session hackathon; it has no application-status gate. Add this procedure to the existing versioned SDK validators/contracts and expose a hook refreshing every 30 seconds while mounted. Preserve getSchedule and its current eligibility.

## Frontend

Blade follows apps/blade/DESIGN_SYSTEM.md and docs/agentic-development/frontend-design-skill.md. A compact section with a bounded scrollable room list, explicit Save, and separate toggle joins hackathon details. Errors preserve edits; successful saves refresh server-read props.

KHIX inherits the current map design. Classify bathroom room polygons explicitly; known ENG2 label coordinates provide the evidence for the initial metadata. Bathroom and restricted appearance take precedence over events and selection. Activity classification uses all matching events and the current clock, independently of selection. Keep color-independent status text and a legend. An initial configuration failure shows Retry rather than assuming restrictions are disabled. On refresh failure, retain the last successful policy and display the error.

Buildings with plans open their first supported floor on selection. Room lookup searches supported floors rather than trusting number-based floor inference. HEC has no floor data, and helpers must handle that safely.

## Migration and rollout

Generate the additive migration; verify fresh installation and upgrade from the preceding schema in disposable loopback databases. No production backfill is needed. Deploy API/schema before the frontend using the new SDK method. Disabling restrictions restores ordinary room presentation without losing the list. Rolling back application code leaves the additive table safely unused.
