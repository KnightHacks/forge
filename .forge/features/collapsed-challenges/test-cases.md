# Behavioral cases

1. First import creates editable General and MLH groups, plus only source-provided prize challenges. New MLH labels join the MLH group. Unrelated imported labels stay standalone.
2. Rename MLH, explicitly ungroup one child, and re-import with another new MLH label: the existing child stays standalone and the new one joins the renamed group.
3. Create multiple every-project groups: each includes every project. Turn the setting off: only opted-in child memberships remain. No every-project group is required.
4. Delete General and MLH, then re-import: neither group returns; their imported children remain standalone. An imported challenge cannot be renamed/deleted through group endpoints.
5. Collapse First Time Hacker into General: its tag stays visible on project cards/details and in the evaluation dialog. Its score and appointment belong to General.
6. Search excludes all child challenges and every-project groups. Ordinary groups and standalone source challenges remain available. Guest searches cannot escape their room's scope.
7. Save a schedule: reject group CRUD, challenge grouping/timing, room/rubric changes, and inventory replacement in the API, including stale clients. Allow add-only imports of unseen Devpost URLs while preserving existing projects, memberships, and appointments. Preserve operational judging and individual appointment repair. Feedback also locks regrouping; duplicate copies of unchanged opt-in IDs remain a no-op.
8. Reject nesting, self-parenting, cross-hackathon parents, assigning an imported challenge as a parent, and deleting a group with active rooms. Deleting a group without active rooms detaches its children without deleting prize definitions.
9. Scheduled scopes with projects but no staffed rooms block scheduling. Explicitly untimed scopes consume no capacity. Scheduling has no mandatory General or every-project scope.
10. Inspect group forms, long challenge names, child filters, parent-only directory pills, and visible feedback child tags in the actual browser. Check responsive layouts and guest privacy.

- Dropping all projects preserves custom group IDs, names, every-project/scheduling settings, and MLH default; re-import restores derived memberships without recreating deleted groups.
- New hackathons have starter groups before CSV import. Existing uninitialized hackathons receive defaults once; initialized organizer choices survive migration.
- Group create/update forms have no color picker and submit no color field. API responses omit stored colors; the final schema and new migration contain no challenge-color column.
- Unjudged General badges retain outline styling, while other badges retain secondary styling. Judged General is dark emerald; other judged badges are lighter emerald. Children match their parent's styling before and after evaluation, including when the parent is renamed.
- Project details retain General/non-General badge variants, and evaluation child tags retain primary-theme styling. Neither uses custom inline colors, including for MLH.

Review regression: child challenges remain selectable in member and scoped guest dropdowns, never render as directory pills, and remain visible within the active parent feedback modal. Every-project groups remain absent from filters.
