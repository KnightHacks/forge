# Behavioral cases

1. First import creates editable General and MLH groups, plus only source-provided prize challenges. New MLH labels join the MLH group. Unrelated imported labels stay standalone.
2. Rename MLH, explicitly ungroup one child, and re-import with another new MLH label: the existing child stays standalone and the new one joins the renamed group.
3. Create multiple every-project groups: each includes every project. Turn the setting off: only opted-in child memberships remain. No every-project group is required.
4. Delete General and MLH, then re-import: neither group returns; their imported children remain standalone. An imported challenge cannot be renamed/deleted through group endpoints.
5. Collapse First Time Hacker into General: its tag stays visible on project cards/details and in the evaluation dialog. Its score and appointment belong to General.
6. Search excludes all child challenges and every-project groups. Ordinary groups and standalone source challenges remain available. Guest searches cannot escape their room's scope.
7. Save a schedule: reject group CRUD, challenge grouping/timing, room/rubric changes, and inventory changes in the API, including stale clients. Preserve operational judging and individual appointment repair. Feedback also locks regrouping.
8. Reject nesting, self-parenting, cross-hackathon parents, assigning an imported challenge as a parent, and deleting a group with active rooms. Deleting a group without active rooms detaches its children without deleting prize definitions.
9. Scheduled scopes with projects but no staffed rooms block scheduling. Explicitly untimed scopes consume no capacity. Scheduling has no mandatory General or every-project scope.
10. Inspect group forms, long challenge names, hidden filters, and visible child tags in the actual browser. Check responsive layouts and guest privacy.
