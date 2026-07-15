# Role Management Spec

Status: Complete

## User-facing purpose

Authorized Knight Hacks organizers need one Blade surface to link Discord roles,
choose the Blade capabilities each role grants, create permission-free cosmetic
roles, keep role membership synchronized, and assign or revoke roles for Blade
users.

## Users / actors

- Officers, who can use every role-management capability.
- Organizers with Configure Roles access, who can create, inspect, edit, sync,
  and unlink roles.
- Organizers with Assign Roles access, who can inspect available roles and
  grant or revoke them for Blade users.
- Signed-in users without either capability, who cannot view role-management
  data or actions.

## User-visible interface

- Role management lives at `/admin/roles` and uses URL-addressable `Roles` and
  `Assignments` tabs.
- The admin navigation shows Roles when the signed-in user can configure or
  assign roles. Each user sees only the tabs and controls they can use.
- The Roles tab lists every linked role without pagination. Users can search by
  Discord role name or ID and filter by access role, cosmetic role, missing
  Discord link, or granted permission.
- Each role row shows the live Discord role, access/cosmetic type, permission
  count, Discord member count when available, sync health, and actions.
- Creating a role normally starts with a searchable Discord-role picker. The
  picker shows role name, color, ID, and member count when available. It omits
  `@everyone`, Discord-managed roles, and roles already linked in Blade.
- A manual Discord-role-ID fallback remains available. Blade validates and
  previews that role before creation.
- A Blade role always uses the exact Discord role name. There is no independent
  Blade label, and the Discord role link cannot be changed after creation.
- The permission editor organizes the existing permissions into Global,
  Members, Hackers, Events, Forms, Roles, and Issues sections. These headings
  only make the existing permission list easier to scan; they do not add
  permissions or imply that every corresponding Reforge page already exists.
- Permission rows show the existing name and description. Users can search,
  select all, and clear all. Selecting Officer access shows a high-impact
  warning.
- Saving zero permissions is valid and labels the role `Cosmetic`. Cosmetic
  roles remain assignable, synchronized with Discord, and available to other
  role-aware Blade features.
- Role detail and editing are shareable through `?role=<role UUID>`. The view
  shows Discord metadata, permissions, assignment count, downstream dependency
  counts, and sync state.
- Creating a role immediately attempts to synchronize existing Blade users who
  already hold it on Discord. A `Sync now` action repeats that reconciliation
  for one role and reports checked, added, removed, skipped, and failed counts.
- The Assignments tab supports fuzzy user search, AND filtering by assigned
  roles, and pages of 25, 50, 100, 250, or 500 users. All Blade auth users are
  eligible, including users without a Member profile.
- Organizers can select several users and roles, preview the number of
  user-role pairs, then grant or revoke the Cartesian product in one action.
- A Discord grant or revoke must succeed before Blade changes that pair. Batch
  results identify successful, skipped, and failed pairs without claiming the
  whole batch succeeded.
- Unlinking requires typing `I am absolutely sure`. It removes the Blade role
  link and Blade assignments but never deletes or removes the Discord role from
  Discord members.
- A role still referenced by another Blade feature cannot be unlinked. The
  admin sees that it is in use; changing those dependencies is deferred.
- Blade prevents an edit or unlink that would remove the final assigned role
  capable of configuring roles or granting officer access.
- Users see stable loading, empty, pending, partial-success, success, and safe
  error states. Desktop uses a scan-friendly table and action panels; mobile
  uses compact role/user cards with 44px touch targets.

## Scope

### In scope

- Discord role discovery with manual-ID fallback.
- Role linking, permission editing, cosmetic roles, detail, sync, and safe
  unlinking.
- User search/filter/pagination and batch role grant/revoke.
- Permission-aware admin navigation and tab access.
- Compatibility with the existing role tables, permission indices, daily role
  sync, and other role-aware data.

### Out of scope

- Creating, deleting, renaming, recoloring, or reordering roles in Discord.
- An independent Blade role name.
- Editing issue-reminder channels or role colors.
- A read-only role-management tier.
- A dependency-resolution workflow for forms, issues, or other features.
- Discord audit-log delivery; a shared audit router will handle that later.
- An `/admin` landing page.

## Vocabulary

- `Linked role`: A Blade role row associated with one immutable Discord role.
- `Access role`: A linked role with at least one enabled Blade permission.
- `Cosmetic role`: A linked role with an all-zero Blade permission bitstring.
- `Blade assignment`: A Blade user-to-linked-role membership row.
- `Sync`: Reconcile one linked role's Blade assignments against current Discord
  membership and refresh its stored Discord name/color.
- `Unlink`: Remove the Blade role and its Blade assignments while leaving the
  Discord role and Discord membership unchanged.

## Acceptance criteria

- Authorized users can open the tabs their capabilities permit; unauthorized
  users cannot read or mutate role-management data.
- A configurator can link an eligible Discord role from the picker or manual-ID
  fallback and configure any valid set of existing permissions.
- A zero-permission role is created, displayed, assigned, and synchronized as a
  cosmetic role without a database migration.
- Discord role names remain the only user-facing role names, and linked Discord
  IDs cannot be changed.
- Creation and manual sync reconcile existing Blade users and report outcomes.
- An assigner can search/filter users, select roles/users, preview a batch, and
  grant or revoke only the pairs whose Discord operation succeeds.
- Safe unlink leaves Discord unchanged, blocks live dependencies and final-admin
  lockout, and requires the exact confirmation phrase.
- The completed interface is usable on desktop and a 320px phone viewport.

## Open questions

- None.
