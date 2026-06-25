# Review Prompt

Use this prompt for agents reviewing a change against specs.

## Goal

Review for correctness, risk, spec alignment, and test quality.

## Inputs

- Git diff
- Relevant requirements/design/interfaces/migration/test-cases docs
- Generated tests
- Validation output

## Checklist

- Does the implementation match requirements?
- Does the design still describe reality?
- Are interfaces unchanged or intentionally updated?
- If persistence changed, is migration behavior documented and tested?
- Do tests cover new behavior and regressions?
- Are tests black-box where appropriate?
- Did the change introduce undocumented scope?
- Did shared package changes identify affected consumers?
- Were validation commands actually run?

## Output

Report findings by severity: blockers, warnings, suggestions, and required spec updates.
