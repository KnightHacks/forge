# Hackathon Configuration Spec

Status: Draft — scope settled with the owner 2026-07-29, awaiting bundle approval

> This file owns the non-technical user/product intent. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## User-facing purpose

Setting up a new hackathon currently requires a developer and a deploy.

The set of hackathons that exist, the mail each one sends when an applicant's
status changes, and the groups hackers are split into on the day are all written
into source. Standing up Knight Hacks IX means a code change, a review, and a
release — for something an officer decides, not an engineer. Nothing about the
work is technical: it is a name, a theme, five dates, six emails, and a handful
of themed group names.

This gives officers that screen. After it, adding a hackathon is data entry.

It is also the first hackathon-domain surface in Reforge. Everything that follows
— hacker management, hackathon events, the dashboard SDK, judging — needs a
hackathon to point at and a set of dates to reason about, so this defines the
shape of both.

## Users / actors

- **Officers** (`IS_OFFICER`) — the only actors. Creating a hackathon, editing
  its dates, and writing the mail every applicant receives are all officer-level
  decisions, and there is no read-only audience worth serving separately.
- Indirect consumers who never open this screen but depend on what it holds:
  every applicant who receives a status email, the hacker management screens that
  read a hackathon's dates and refuse status changes without configured mail, the
  standalone hackathon sites, and the email portal.

## User-visible interface

### `/admin/hackathon` — the list

A top-level admin route with its own sidebar entry.

Every hackathon, newest first, labelled by its display name — "Knight Hacks IX",
not `knight-hacks-ix`. There is no archive cutoff; past hackathons stay listed,
because they remain the thing other screens point at.

Any hackathon missing required mail is unmistakable here, not just on its own
page. See **Unconfigured state** below.

### Creating and editing a hackathon

One screen, three sections.

**Identity and dates.** Display name, route name, theme, and the five dates:
applications open, application deadline, confirmation deadline, start, end. The
dates must be in that order, and the screen says which one is wrong when they
are not.

The route name is the hackathon's stable identifier — lowercase and hyphenated.
It is no longer a public link: applications live on the hackathon's own site, not
in Blade. It can be edited freely, because nothing outside Blade depends on it.

There is also an optional **application link** — the address of the hackathon
site's own application page. It is typed in rather than built from the route
name, because the hackathon site owns its paths and may change them. Blade will
later use it to show members a callout while applications are open; leaving it
empty is fine and holds nothing else up.

**Status mail.** Six rows, one per applicant status that sends mail:

| Status reached | When it fires                                                  |
| -------------- | -------------------------------------------------------------- |
| Pending        | an application is submitted                                    |
| Accepted       | an officer accepts                                             |
| Waitlisted     | an officer waitlists                                           |
| Confirmed      | an accepted applicant confirms their spot                      |
| Denied         | an officer rejects — the copy explains the hackathon filled up |
| Withdrawn      | an applicant withdraws                                         |

Checking in sends nothing.

Each row holds a subject line and a mail template. Both are edited here — an
officer does not leave for the email portal, write six templates, and come back.
Subject and body sit together on purpose, so the two cannot quietly drift apart
into a subject that no longer matches the mail it heads.

Every row can be previewed against an example applicant before saving. The
example is a hacker, not a club member — the two carry different fields, and how
a name is derived differs between them, so a member-shaped preview would mislead.

A new hackathon starts with all six blank. Templates are never copied forward
from the previous hackathon, so a hackathon never reads as ready before it is.

Templates are shared with the email portal rather than hidden inside this
screen, so an officer can still reach one from there for an unusual one-off send.
They carry a hackathon badge in the portal's list, because six per hackathon
accumulate quickly beside club campaign templates.

### Classes

Optional, and independent of everything above. A hackathon with no classes is
perfectly valid and is not flagged as incomplete.

Classes exist for logistics. Roughly a thousand people cannot be fed at once, so
they are split into groups and the split is themed to make it enjoyable rather
than bureaucratic. A large hackathon might want six; a small one, three. There is
no fixed number and no fixed set of names — each hackathon invents its own.

An officer defines any number of classes. Each has:

- a **name**, specific to this hackathon's theme;
- a **Discord role**, created by an officer in Discord and linked here, used to
  ping the group and grant it channel access;
- a **color**, chosen here rather than read from the Discord role, because it may
  drive hacker-facing surfaces and must be changeable without touching Discord.

Each class also shows its current headcount, so an officer can see the split.

**VIP** is configured alongside the classes but is not one of them. It also has a
name, a Discord role, and a color. What makes it different is what it does: a VIP
ignores class boundaries. When class A is called, a VIP assigned to class B may
still go. A hacker holds a normal class and may additionally be VIP — the two are
not alternatives.

Hackers are not assigned to classes here, and there is nothing to configure about
how assignment works: on check-in, a hacker joins whichever class currently has
the fewest people. That is the whole rule.

### What this screen does not yet do

Linking a Discord role records the link. It does not grant anyone the role, and
nothing here changes the Discord server. Roles are applied when hackers check in,
which does not exist yet — so class headcounts read zero until it does.

The screen must say this plainly. An officer who links a role and assumes it took
effect has been misled by the interface.

### Unconfigured state

A hackathon can be saved before its mail is written. It is not required at
creation, because dates and identity are often settled before copy is.

But an incomplete hackathon is loud. It carries heavy warning treatment and a
banner stating plainly that no status changes are allowed until its mail is
configured, both on its own page and in the list. An officer should never reach
hacker management and discover the gap by being refused mid-decision — the point
of the warning is to be seen first, in the place the problem is fixed.

The refusal itself lives on the hacker management screens, not here.

### Deleting a hackathon

Allowed only while no one has applied. The first application makes a hackathon
permanent, because deleting it would take every application with it.

### Save semantics

Explicit. An officer edits, then presses Save. No save-on-toggle and no
optimistic update, matching the house pattern.

## Scope

### In scope

- Create, edit, and list hackathons: display name, route name, theme, five dates,
  and an optional application link.
- Delete a hackathon that has no applications.
- Per-hackathon, per-status subject and mail template for the six sending
  statuses.
- Authoring, editing, and previewing those templates without leaving the screen.
- A visible unconfigured state for any hackathon missing required mail.
- Defining any number of classes per hackathon, each with a name, a linked
  Discord role, and a color, plus a VIP entry configured the same way.
- Showing the current headcount per class.
- Retiring the source-level hackathon list, its per-hackathon mail identifiers,
  and its compile-time default, so adding a hackathon needs no deploy.
- Retiring the fixed six class names and the unused two-team concept.
- Retiring the application-background settings, which existed to style an
  application Blade no longer hosts.

### Out of scope

- **Hacker management** — the applicant table, status changes, and the refusal
  when mail is unconfigured. This bundle defines the configuration those screens
  read; it does not build them.
- **The soft-blacklist flag.** Wanted, but it belongs with hacker management. It
  is a flag that prevents accidental acceptance and sends nothing — deliberately
  not a new applicant status.
- **Hacker application intake.** It moves to the standalone hackathon sites.
- **Class assignment and Discord role application.** A hacker joins the smallest
  class and receives its role at check-in. Check-in is a later area; this bundle
  only records what the classes and roles are.
- **The member-facing "applications are open" callout.** This bundle stores the
  application link; it does not build the banner. That banner belongs on the
  member dashboard as a member-to-hacker conversion prompt, shows automatically
  between applications-open and the application deadline, and renders once per
  hackathon whose window is open — several at a time if several overlap. It
  needs no stored "current hackathon," which is why it can wait.
- **Hackathon events, points, judging, analytics, and the dashboard SDK.**
- **Any notion of a stored "current hackathon."** Hackathon state is read from
  its dates. Admin screens list hackathons and let an officer pick.
- **Bulk-send mechanics and send history.** Mail fires on status change; the
  email portal already owns deliberate campaigns.

## Vocabulary

- `Hackathon`: one Knight Hacks event with its own identity, dates, and mail.
- `Display name`: the human label, e.g. "Knight Hacks IX". What officers see.
- `Route name`: the lowercase hyphenated slug, e.g. `knight-hacks-ix`. The
  hackathon's stable identifier inside Blade.
- `Application link`: the address of the hackathon site's own application page.
  Optional, and owned by that site rather than derived from anything in Blade.
- `Status`: where an applicant stands — pending, accepted, waitlisted, confirmed,
  denied, withdrawn, or checked in.
- `Status mail`: the subject and template sent when an applicant reaches a
  status.
- `Unconfigured`: a hackathon missing required status mail. Saveable, visibly
  flagged, and unable to accept status changes.
- `Class`: one of a hackathon's themed groups, used to stagger a thousand people
  through things like meals. Has a name, a Discord role, and a color. A hacker
  belongs to at most one.
- `VIP`: a configured entry that lets a hacker ignore class boundaries. Held in
  addition to a class, not instead of one.
- `Officer`: a Blade user holding `IS_OFFICER`.

## Acceptance criteria

- **AC-001.** An officer can create a hackathon with a display name, route name,
  theme, and five dates, and it appears in the list without a deploy.
- **AC-002.** A non-officer cannot reach the screen and is redirected.
- **AC-003.** Dates out of order are rejected with a message naming the date at
  fault.
- **AC-004.** Hackathons list newest first, labelled by display name.
- **AC-005.** An officer can set a subject and template for each of the six
  sending statuses, and can write a template without leaving the screen.
- **AC-006.** A hackathon saved without complete status mail is accepted and
  shown as unconfigured, with a banner stating no status changes are allowed,
  both on its page and in the list.
- **AC-007.** Once every required status has a subject and template, the
  unconfigured state clears.
- **AC-008.** A hackathon with no applications can be deleted; one with any
  application cannot, and the screen says why.
- **AC-009.** Templates written here are reachable from the email portal and
  carry a hackathon badge in its list.
- **AC-010.** A status email can be previewed against an example applicant, and
  the example is hacker-shaped rather than member-shaped.
- **AC-011.** A newly created hackathon has six blank templates; nothing is
  carried forward from a previous hackathon.
- **AC-012.** An officer can add any number of classes, each with a name, a
  linked Discord role, and a color, and can configure VIP the same way.
- **AC-013.** A hackathon with no classes saves cleanly and is not shown as
  unconfigured.
- **AC-014.** Each class shows its current headcount.
- **AC-015.** The screen states plainly that linking a Discord role does not
  grant it, and that roles apply at check-in.
- **AC-016.** Adding a hackathon requires no source change — no hackathon list,
  mail identifier, default, or class names in code.
- **AC-017.** An officer can set and clear an optional application link, and
  leaving it empty blocks nothing.
- **AC-018.** A class with hackers assigned to it cannot be deleted, and the
  screen says why.
- **AC-019.** Existing hackathons keep their identity, dates, and applications
  through the change.

## Open questions

- Are all six status emails required before a hackathon counts as configured, or
  are some optional? `Withdrawn` in particular is an applicant's own action and
  may not warrant mail.
- Should the list mark which hackathons currently have an open application
  window? Purely a convenience for officers; the dates already say it.
