# Whitespace-Aware Form Character Limits Spec

Status: Approved

> This file owns the non-technical user/product intent. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## User-facing purpose

People answering Blade forms should have text limits based on the characters
they write, excluding whitespace. The visible counter and submission behavior
must agree so a response is not rejected after the interface presented it as
within the limit.

## Users / actors

- Members and other authenticated people responding to Blade forms.
- Officers who configure short-answer and paragraph questions.

## User-visible interface

Short-answer and paragraph fields show the current character count and the
configured maximum. Spaces, tabs, and line breaks do not increase that count.
The count uses the existing muted Blade form styling and switches to an error
color when the response exceeds the limit.

## Scope

### In scope

- Whitespace-aware counters for short-answer and paragraph responses.
- Matching whitespace-aware validation when responses are created or edited.
- Existing forms receive the behavior without being recreated.

### Out of scope

- Changing limits configured by officers.
- Changing how submitted response text is stored or displayed.
- Changing validation for non-text question types or choice-question "Other" values.

## Vocabulary

- `character count`: the JavaScript string length after all whitespace
  characters are removed.

## Acceptance criteria

- `a b c` displays a count of 3.
- Spaces, tabs, and line breaks do not consume the configured limit.
- A response at the non-whitespace limit is accepted.
- A response above the non-whitespace limit is rejected in both create and edit flows.
- The submitted string is preserved exactly; counting does not trim or rewrite it.

## Open questions

- None. The user explicitly requested that the behavior from PR #482 be remade
  against current `main`.
