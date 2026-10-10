# Technical requirements

Scope: Blade organizer queue, apps/2026 hacker printing, and their shared API, SDK, validators, constants, DB, and email packages. Existing uploads, availability, and access gates remain intact. Use Blade design tokens and existing KHIX styles.

Add nullable PrintJob.category (project/personal, checked in SQL), categoryReminderAttemptedAt and categoryReminderSentAt. Null preserves legacy requests. New submits require a category. Owners update through an idempotent participant command with attendee/hackathon scoping and a row lock. Organizers use PRINTING_QUEUE and the same editable statuses. Audit changes.

Share SQL ordering between organizer listing and position calculations: printing first; project requests next; personal and uncategorized together; original createdAt then id inside each group. Never restart active work. Category edits preserve timestamps, files, and notes.

Render status/reminder email with Forge's existing safe React Email TSX compiler using the IX arrival design. Provider delivery remains the existing transactional gateway. Only explicit organizer ready-time overrides may be included; remove automatic equal-duration estimates from notices. Status changes commit before delivery and report each channel result independently.

The one-time reminder command previews counts by default and requires --send plus production email mode to send. Claim eligible jobs atomically before provider calls; record attempted and accepted timestamps. Claims prevent concurrent/repeated invocations from sending again. Ambiguous failures remain attempted and require operator inspection, never automatic retries. Recheck eligibility when claiming, and consolidate multiple jobs by recipient email. No live email during testing.

Rollout: generate/review additive migration; verify on a disposable local DB; migrate production before deploying consumers. User requested feature and email changes, and explicitly selected sending after launch. Verify deployed category UI before running reminder command. Rollback code retains added nullable columns and existing jobs. Do not drop migration history.

## Branch-only session follow-up

Work stays on codex/printing-category-ci and PR #618. No main push, merge, production migration, or bulk email send is part of this follow-up.

Reuse PrintJob.statusChangedAt as the printing start and estimatedReadyAt as the saved finish estimate. Extend updateStatus with optional durationMinutes; the new organizer UI requires a duration when selecting Printing, while existing clients may still start an untimed print. Validate whole minutes from 1 to the existing 600-minute estimate bound. The user clarified that estimates such as 90 minutes must be allowed even though the published session policy is one hour. Store start and calculated finish atomically under the existing job row lock. Existing running jobs can still receive note updates without a new timer. Calculate duration edits from the original start and audit the changed estimate; one mutation emits at most one notification. Clear the timer when a print leaves Printing. Keep the old ready-time endpoint for already deployed clients, but remove its control from the UI. No schema changes are needed.

Expose active category counts and on-hold count on the queue DTO, with null defaults for older cached responses (unknown counts must not appear as zero). Keep the existing overall position. Derive all positions from the existing server ordering. Needs-clarification jobs are excluded from positions. Reuse an app-agnostic Countdown primitive in @forge/ui across Blade and KHIX. Countdowns use persisted timestamps, update locally, clean up interval subscriptions, and never perform automatic status mutations or repeated notifications.

The exact filament inventory is explicitly scoped to the current KHIX event, beside its existing Shinies branding; this limited event update does not add an inventory-management schema. Show the supplied one-hour session policy in the KHIX request flow; warn organizers when their estimate exceeds it, while still allowing an honest estimate. Preserve existing styling and validate desktop and 320px views.
