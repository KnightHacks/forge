# Whitespace-Aware Form Character Limits SRD

Status: Approved

> This file owns technical implementation constraints. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## Technical purpose

Make short-text and paragraph response limits count non-whitespace characters
consistently in the Blade respondent UI and the shared form-answer validator.

## Relevant principles

- [`forge-engineering-principles.md`](../../../docs/agentic-development/forge-engineering-principles.md): validation, React/Next.js, testing, readability, and package-boundary principles.
- [`apps/blade/DESIGN_SYSTEM.md`](../../../apps/blade/DESIGN_SYSTEM.md): form controls, typography, and accessible muted/error states.

## Access policy

No access policy changes. Existing form visibility, response, edit, and officer
configuration permissions remain authoritative.

## Architecture / data flow

`@forge/validators` owns one pure exported non-whitespace counting helper and
uses it while parsing short-text and paragraph answers. Blade imports the same
helper for its counter so the interface and submission boundary share one
definition. Response values continue through the existing tRPC procedures and
are stored unchanged.

## tRPC/API behavior

No procedure shape or route changes. Existing `forms.createResponse` and
`forms.updateResponse` calls continue to validate through
`validateFormAnswers`.

## Validation

Short-text and paragraph values must be strings whose non-whitespace character
count is at most the question's `maxLength`. Validation must preserve the
original string and provide a limit-specific error message.

## Data / migration / compatibility

No schema, migration, or persisted-form changes. Existing definitions use the
new runtime behavior immediately. Rollback is a code revert.

## Discord integration

None.

## Configurability review

Would this require a developer change next year?

- Answer: No. The existing officer-configured `maxLength` remains the source of truth.
- If yes, why is hard-coding acceptable or what admin-configurable path is planned? Not applicable.

## React / frontend constraints

Keep the current client form component and existing controls. Replace the raw
HTML `maxLength` constraint for text questions because it counts whitespace and
would conflict with the product rule. Show a subdued 14px counter linked to the
field with `aria-describedby`; use the destructive token above the limit.

## Testing / verification strategy

- Add validator regression coverage in `@forge/validators` for spaces, tabs,
  line breaks, boundary acceptance, overflow rejection, and value preservation.
- Add Blade rendering coverage for visible counts and removal of the raw HTML
  `maxLength` constraint.
- Run targeted package/app tests, typechecks, lint/format, changed React
  analysis, then Forge's required repository checks.

## Open questions

- None.
