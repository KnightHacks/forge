# Career Job Storage

Implement storage for #647, part of #633. Members will explore jobs, track
applications, find others in process, and configure alerts. Officers will register
employer boards for supported providers. This slice adds storage and tests only.

Agreed behavior: eight new tables; one primary Discord post total per job; multiple
locations per listing; shared daily digests with separate track opt-ins. Retain
inactive jobs for application history. Rolling-feed disappearance or failed polls
cannot establish closure. Explicit employer evidence determines track; otherwise
keep the first accepted track. Reclassification never authorizes another post.

Reuse existing company identity without auto-approving scraped companies. Members
control application visibility and private notes always remain private. No UI,
API workflows, production migration, old preference import or historical job
import is included. Acceptance: isolated migration succeeds, existing data survives,
opt-ins default off, constraints reject invalid/duplicate records, consumers compile.

Application history records a dated stage, optional interview round and optional
interview label for each change, including moves between numbered rounds within
`interviewing`. Labels can describe a round as behavioral or technical. The later
application API must insert the new snapshot in the same transaction as the
current-state update.
