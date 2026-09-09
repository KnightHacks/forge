# Technical requirements

Scope: Blade judging/projects and their existing API, validator, and DB packages. Follow the Blade design system and existing permissions, audit, transactions, and schedule locks.

ProjectChallenge retains the judging-scope identity needed by rooms, appointments, and evaluations. isGroup distinguishes editable Blade groups from imported challenges; only groups may be parents. isGeneral now means includes every project, independent of label, with no uniqueness requirement. isScheduled remains explicit scheduling policy. parentId references a same-hackathon group and nesting is rejected.

ProjectToChallenge stores explicit imported opt-ins and derived group memberships, distinguished by isOptIn. Rebuilding derived links includes child parents and every-project groups. This preserves existing appointment/evaluation/draft membership foreign keys. Only imported challenges may be selected when editing a project's opt-ins.

HackathonJudgingConfiguration.challengeGroupsInitializedAt prevents deleted or renamed starter groups from being recreated during import. A group's importLabelMatch is import-only bootstrap policy: the starter MLH group uses MLH, case-insensitively, for newly encountered source labels. Renaming retains that policy; deletion removes it. Existing challenges' parent choices always win on re-import. Display names are not runtime group identities.

Hackathon creation initializes starter groups; a data migration initializes older hackathons once, and import retains a fallback for uninitialized inventories. Actual challenge rows come only from Devpost labels. Dropping projects preserves groups, their settings, and the initialization marker. Imported challenges and groups may share a display name without sharing identity. createGroup/updateGroup/deleteGroup require project-management permission, a hackathon lock, and editable setup. deleteGroup detaches children but rejects active-room assignments. Every-project membership and scheduling are independently configurable, and there is no mandatory default group.

Filters include children and hide every-project groups. Directory pills exclude children; project details and evaluation dialogs retain them. Evaluation scope, score aggregation, and scheduling resolve children to parents. Guest filters cannot broaden authorization. Saved schedule and existing feedback guards remain enforced server-side.

Migration 0053_challenge_groups consolidates the four unpublished migrations originally numbered 0053–0056. It preserves their schema and ordered backfills with one final Drizzle snapshot, including group initialization. Migrations through main’s 0052 remain unchanged. The user authorized local KH8/KH9 judging cleanup separately; no migration clears production judging data. KH8 is the local test workspace. Never commit the source CSV or participant data.

Validate group CRUD, deletion without resurrection, multiple/no every-project groups, imported-only opt-ins, MLH defaults with rename and explicit override preservation, child search options with visible feedback-modal eligibility, missing-room scheduling errors, guest isolation, and saved-schedule locks. Run root precommit checks, targeted DB/API/Blade tests, and real browser screenshots before committing.

Upgrade limitation: legacy MLH inventories stored only the umbrella membership. Their original child memberships must be restored by a replacement Devpost import before using the new grouping controls. The migration does not reconstruct historical prize opt-ins or evaluations. The local KH8 testing reset/re-import was explicitly authorized; production rollout must arrange equivalent inventory replacement before judging.

Organizers can designate any group as the default for new MLH imports. Selecting it moves that import policy from the previous group without moving existing children. Clearing or deleting the default disables this automation until another group is designated.

Local upgrade note: databases that applied all four original migrations already have the final schema. Do not rerun the consolidated SQL against them. A database partway through the original sequence must finish that sequence before switching, or use a fresh disposable database. This cleanup does not reset a local database or rewrite its migration ledger. Shared and production rollout starts from main’s 0052 and applies consolidated 0053 normally.

Custom-color removal: group inputs, writes, defaults, API projections, rendered tags, schema, and audit contracts no longer use tagColor. The user confirmed this PR is unmerged and authorized updating its single migration and matching snapshot directly. Migrations on main remain unchanged. No follow-up color migration or compatibility fields are retained. Preserve parent evaluation-count resolution and existing General/non-General and judged-state styling.

Review regression: child challenges remain selectable in member and scoped guest dropdowns, never render as directory pills, and remain visible within the active parent feedback modal. Every-project groups remain absent from filters.
