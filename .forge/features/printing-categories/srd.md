# Technical requirements

Scope: Blade organizer queue, apps/2026 hacker printing, and their shared API, SDK, validators, constants, DB, and email packages. Existing uploads, availability, and access gates remain intact. Use Blade design tokens and existing KHIX styles.

Add nullable PrintJob.category (project/personal, checked in SQL), categoryReminderAttemptedAt and categoryReminderSentAt. Null preserves legacy requests. New submits require a category. Owners update through an idempotent participant command with attendee/hackathon scoping and a row lock. Organizers use PRINTING_QUEUE and the same editable statuses. Audit changes.

Share SQL ordering between organizer listing and position calculations: printing first; project requests next; personal and uncategorized together; original createdAt then id inside each group. Never restart active work. Category edits preserve timestamps, files, and notes.

Render status/reminder email with Forge's existing safe React Email TSX compiler using the IX arrival design. Provider delivery remains the existing transactional gateway. Only explicit organizer ready-time overrides may be included; remove automatic equal-duration estimates from notices. Status changes commit before delivery and report each channel result independently.

The one-time reminder command previews counts by default and requires --send plus production email mode to send. Claim eligible jobs atomically before provider calls; record attempted and accepted timestamps. Claims prevent concurrent/repeated invocations from sending again. Ambiguous failures remain attempted and require operator inspection, never automatic retries. Recheck eligibility when claiming, and consolidate multiple jobs by recipient email. No live email during testing.

Rollout: generate/review additive migration; verify on a disposable local DB; migrate production before deploying consumers. User requested feature and email changes, and explicitly selected sending after launch. Verify deployed category UI before running reminder command. Rollback code retains added nullable columns and existing jobs. Do not drop migration history.
