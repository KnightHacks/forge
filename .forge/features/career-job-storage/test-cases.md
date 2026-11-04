# Career Job Storage Test Cases

- TC01: Fresh migration creates seven tables; sources default disabled and jobs suppressed.
- TC02: Concurrent duplicate job and observation identities yield one successful insert; multiple sources may reference one job.
- TC03: City/state/remote/unknown locations retain text. Reject malformed keys and contradictory shapes.
- TC04: One application per member/job; enforce stage/round bounds. Inactivity preserves history and deletion cannot remove referenced jobs.
- TC05: Sent job/digest records require receipts; reject malformed IDs, unpaired leases and sending without a claim.
- TC06: Duplicate digest schedule fails despite destination changes; reject reversed/future windows.
- TC07: Alert identity is unique per member/track/kind/target; member deletion cascades personal records.
- TC08: Upgrade pre-feature member/company fixtures; preserve values and default both opt-ins false.
- TC09: Query new relations through the DB client; all consumers typecheck and validators regress cleanly.
- TC10: Preserve incompressible long identifiers, Unicode and literal backslashes; generated fingerprints match UTF-8 SHA-256 and typed upserts resolve duplicates. Distinct job identifiers remain distinct.

API privacy, matching, closure, authorization, role sync and actual Discord recovery
are follow-up tests, not claims made by this schema implementation.
