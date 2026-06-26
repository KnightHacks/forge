# <Feature Name> SRD

Status: Draft

> This file owns technical implementation constraints. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## Technical purpose

<!-- What system capability is being added or changed? -->

## Relevant principles

<!-- Link to docs/agentic-development/forge-engineering-principles.md sections this feature must follow. -->

## Access policy

<!-- Required for every SRD. Identify unauthenticated, logged-in, and permission-based/officer/admin access. -->

## Architecture / data flow

<!-- Apps as thin clients, @forge/api platform logic, @forge/db schemas/client only, @forge/validators schemas, etc. -->

## tRPC/API behavior

<!-- Procedures, routers, input validators, errors, metadata/descriptions for future generated API/LLM context. No REST for business logic. -->

## Validation

<!-- Zod/@forge/validators expectations. -->

## Data / migration / compatibility

<!-- Data changes, config/admin tables, migration caveats, rollback/cutover notes if relevant. Separate migration.md only if this becomes too large. -->

## Discord integration

<!-- Role sync, role assignment, announcements, threads, guild profile behavior, Discord source-of-truth/side effects if relevant. -->

## Configurability review

Would this require a developer change next year?

- Answer:
- If yes, why is hard-coding acceptable or what admin-configurable path is planned?

## React / frontend constraints

<!-- Server-first pages, no use client at page level, hooks, loading/error/success UX, design-system refs. -->

## Testing / verification strategy

<!-- Unit/integration/e2e placement and commands. -->

## Open questions

- <!-- question -->
