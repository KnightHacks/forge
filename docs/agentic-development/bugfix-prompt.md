# Bugfix Prompt

Use this prompt for bugs discovered during Reforge work.

## Goal

Fix bugs by teaching the repository what was missing, not by patching blindly.

## Required process

1. Reproduce or characterize the bug.
2. Identify whether requirements, design, interfaces, migration, or tests are missing/wrong.
3. Update the relevant artifact.
4. Add a regression test case.
5. Generate or implement the regression test.
6. Confirm the regression fails before the fix when practical.
7. Implement the smallest fix.
8. Run validation.

## Rules

- Do not weaken existing tests.
- Do not change public contracts silently.
- Do not add unrelated behavior or cleanup.
- Do not broaden the fix beyond the reproduced failure without spec updates.
