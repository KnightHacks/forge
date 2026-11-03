# Career Discord Configuration Spec

Status: implemented and locally verified; user authorized PR submission.

## Product promise

Officers can configure Career posting destinations and digest notification roles
in Blade's existing `/admin/roles/config` screen. Reorganizing Discord should
not require a developer to change destination IDs in source code.

This implements configuration for [#648](https://github.com/KnightHacks/forge/issues/648),
part of [Career #633](https://github.com/KnightHacks/forge/issues/633).

## Settings and people

| Setting                     | Purpose                                         |
| --------------------------- | ----------------------------------------------- |
| Internship posting channel  | Internship posts and digests                    |
| New-grad posting channel    | New-grad posts and digests                      |
| Internship digest role      | Opt-in audience mentioned by internship digests |
| New-grad digest role        | Opt-in audience mentioned by new-grad digests   |
| Source-health alert channel | Optional destination for source-failure alerts  |

Officers edit settings. Notification roles choose recipients and do not grant
access to officer settings. The existing Officers role remains separate.
Members' role subscriptions and actual delivery are owned by later tickets.

## Settled behavior

- Use the existing editor, with production and development ID fields and Save.
- Digests share their track's posting channel; no extra digest channel is added.
- The failure channel starts **Not configured**. An officer can set or clear it
  later. Other production IDs remain required.
- All five settings display **Unused** until real consumers are added.
- Ordinary edits preserve the existing officer gate, audit history, and cache
  invalidation. Reloading shows the persisted value.
- Adding configuration does not send messages or assign Discord roles.

The user supplied the four production destinations/audiences and explicitly
requested leaving the failure destination unset for officer setup later.
Consolidated-channel IDs were recorded as context, not extra settings.

## Acceptance

1. Officers see all five settings under the correct channel/role groups.
2. Valid edits persist; non-officers cannot read or edit officer configuration.
3. Existing settings and officer edits survive migration and seed replay.
4. The unset failure entry is visible, editable, and accurately labelled.
5. Cron/API callers can resolve required IDs or explicitly read an optional ID.
6. Missing migration rows remain errors rather than silently disabling delivery.

## Scope limits and remaining setup

No job polling, posting, digest scheduling, subscription management, new Discord
objects, channel picker, or new settings page. Downstream #651/#653/#654 own
consumers. They must skip only an unset failure notification while retaining
normal work and error logging.

Development destinations remain unknown. Resolve them or explicitly accept the
existing production fallback before real non-production delivery is connected.
Coordinate the five-key contract with downstream owners and confirm deployment
sequencing before merge.
