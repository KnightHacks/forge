# Behavioral checks

- New requests require a valid category; legacy null reads remain supported.
- A newer project precedes older personal/uncategorized waiting jobs. Printing remains first. FIFO and ID tie-breaks hold within each group, consistently across both views.
- Owner can categorize while queue closed. Another hacker/hackathon cannot. Printing/terminal jobs reject changes. Replay and same-category saves are harmless; timestamps/files remain unchanged.
- Organizers need PRINTING_QUEUE to categorize and see category badges.
- Migration keeps existing jobs/files and defaults category to null; invalid SQL category is rejected; lineage remains intact.
- Every organizer status and note change reaches the email gateway with current status, description, category, and IX design. No-op saves send nothing. Discord failure does not block email or committed status. Provider failure is reported.
- Reminder targets only editable uncategorized requests, groups multiple jobs into one email, skips missing contacts/portal, and cannot send twice on repeat/concurrent calls. Failed/ambiguous delivery remains visible without automatic retries.
- Desktop and 320px mobile: required new category, visible legacy prompt, saved category while closed, project priority copy; no fixed print-time claims. Preview email HTML/text for escaped content and correct links/artwork.
