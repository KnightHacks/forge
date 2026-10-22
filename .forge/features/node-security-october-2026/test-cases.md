# October 2026 Node.js Security Update Test Cases

## Runtime invariant

- `.nvmrc`, root engines, and all 18 Node stages agree on patched 24.22.1.
- CI reads `.nvmrc`; no independent old CI version bypasses the pin.
- Engine range accepts 24.22.1 and newer 24.x; rejects 20.x, 22.x, 24.22.0,
  EOL 25.x, and early unpatched 26.x. Other supported majors are outside the
  deliberately chosen, production-aligned 24.x compatibility contract.
- Docker registry publishes the exact tag for Linux amd64 and arm64.

## Security and legitimate controls

- Compare DNS NUL handling with the prior local runtime and patched runtime.
- Valid DNS behavior and a Brotli round trip remain functional.
- Exercise real OR-Tools scheduling and Sharp encode/decode under patched Node.
- Do not claim a CVE reproducer for vulnerabilities without a verified trigger.
  Upstream release identity is the evidence for the remaining runtime fixes.

## Repository and container checks

Run `pnpm format`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` with the patched
Node at the front of PATH and Turbo cache bypassed. Exercise representative static,
standalone Next, and bot images when practical. Record exact failures and skipped
checks in `status.md`; do not expand this patch to unrelated baseline failures.
