# October 2026 Node.js Security Update Spec

Status: Scoped from the user's security-maintenance request (2026-10-21).

## Purpose and scope

Address the Node.js October 21 security release across Forge's development, CI,
and container runtimes. Keep existing application behavior and dependencies.
The user requested a branch from main named `update-vulernerability`, no commits,
and validation results plus commands for committing manually.

## Acceptance criteria

- Contributors and CI use a supported, patched Node release.
- Every Node container build and runner stage uses the patched release.
- Existing checks and native dependencies are exercised under that release.
- Results distinguish source changes from production rollout and skipped checks.

## Non-goals and open questions

No app/UI, schema, permission, dependency, PHP, or production-service changes.
No PHP source or Composer manifest is tracked. Actual production runtime versions
and deployment completion require operator access; do not infer them from source.
