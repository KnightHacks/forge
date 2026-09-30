# 3D Printing Queue Spec

Status: Draft, awaiting human approval

> This file owns the user and product behavior. Technical design belongs in `srd.md`.

## User-facing purpose

Some hackathons have a 3D printer on site. Today hackers ask organizers in
person or on Discord, requests get lost, and nobody can see what is next. The
hacker dashboard already shows a locked `3D Printing` tab.

Checked-in hackers should be able to submit a print job with a description and
files, follow its status, and hear about changes without refreshing the page.
Organizers who run the printer should see one queue in submission order, open
each job's description and files, reach the submitter when something needs
checking, and move the job through printing to pickup.

## Users and actors

- **Checked-in hacker:** a participant whose application for the current
  hackathon has status `checkedin`. Submits, views, and cancels their own jobs.
- **Other hackers:** anyone signed in to the portal who is not checked in. They
  see the tab locked and cannot submit.
- **Printing organizer:** a Blade user whose role grants the new
  `PRINTING_QUEUE` permission, or an officer. Views and works the queue and
  chooses the Discord channel.
- **Discord:** receives a new-job notice in the configured channel, and DMs the
  hacker when an organizer changes a job's status.

## User-visible interface

### Hacker portal (KH IX)

The `3D Printing` rail item stays locked until the hacker is checked in. After
check-in it opens `/dashboard/printing`. Visiting that URL before check-in shows
the same locked stage the Events page uses.

The page has two parts.

**New print job.** A description field and a file picker. A job needs a
description and at least one file, up to 5 files. Accepted files are 3D models
(`.stl`, `.3mf`, `.obj`, `.step`, `.stp`) and reference images (`.png`, `.jpg`,
`.jpeg`), each up to 50 MB. Each file shows its own upload progress and error.
A rejected file names the reason, such as "too large" or "file type not
accepted". Submitting shows a success message, clears the form, and adds the job
to the list.

**Your print jobs.** Newest first. Each job shows its description, file names,
submitted time, and a status pill. A job marked `Needs clarification` shows the
organizer's note. A job that is `Received` or `Needs clarification` has a
`Cancel` action with a confirmation step. The list has loading, empty, and
error states.

### Blade

A `Printing Queue` item appears in the admin navigation's Hackathon group for
users with `PRINTING_QUEUE` or officer access. Everyone else neither sees the
item nor can open the page.

The page shows one hackathon's queue, defaulting to the current hackathon.

- **Status filters** with a count on each: All, Received, Printing, Needs
  clarification, Ready for pickup, Picked up, Cancelled. The selected filter is
  kept in the URL.
- **Queue list** in submission order, oldest first. Each row shows the
  submitter's name, submitted time, status, a short description, and the file
  count.
- **Job details** open from a row. They show the full description, a download
  link per file, the submitter's name, email, phone, and Discord username, and
  how many jobs this hacker has cancelled at this hackathon. The organizer picks
  a new status and can add a note for the hacker. A note is required for
  `Needs clarification`, so the hacker always learns what is needed. Saving
  closes the details, shows a toast, and updates the list.
- **Discord channel** setting: search the guild's text channels, save one, or
  disconnect. The page states that the channel should be visible only to
  organizers, because new-job notices include hacker names.

### Discord and email

- **New job:** when a hacker submits, Blade posts in the configured channel. It
  mentions the roles that hold `PRINTING_QUEUE` and gives the submitter's name
  and submission time. With no channel configured, nothing is posted and the job
  still goes through.
- **Status change:** when an organizer changes a job's status, the hacker gets a
  Discord DM and an email with the new status and any note. Each is attempted
  independently, so a hacker with DMs closed still gets the email. A delivery
  failure never undoes the status change, and Blade tells the organizer which
  notice failed.

## Scope

### In scope

- New `PRINTING_QUEUE` permission covering both reading and updating the queue.
- Server-enforced unlock of the portal tab and page at `checkedin`.
- Job submission with description and 1 to 5 files within the type and size
  limits above.
- Hacker job list with status, organizer note, and cancel.
- Blade queue page with status filters, job details, file download, contact
  info, cancel count, and status updates with an optional note.
- Configurable Discord channel per hackathon, with role mentions on new jobs.
- Discord DM and email to the hacker on organizer status changes.

### Out of scope

- Editing a job or adding files after submission.
- Printer hardware integration, print time estimates, or queue position numbers.
- Assigning jobs to specific organizers or printers.
- Pausing or closing the queue.
- Limiting how many jobs one hacker can have open at once.
- Mentioning officer roles in new-job notices. Only roles granted
  `PRINTING_QUEUE` are pinged.
- Automatically removing files that were uploaded but never submitted. The
  cleanup exists but is scheduled in a follow-up.
- Notifying the hacker about their own actions (submit, cancel).
- Deleting files after the hackathon ends. This is a follow-up.
- Hacker portals other than KH IX.

## Vocabulary

- **Print job:** one hacker request, with a description and files.
- **Status:** one of `Received`, `Printing`, `Needs clarification`,
  `Ready for pickup`, `Picked up`, `Cancelled`.
- **Organizer note:** text an organizer attaches to a status change. The hacker
  sees it. Required for `Needs clarification`, optional otherwise.
- **Cancel count:** how many of a hacker's jobs at this hackathon ended as
  `Cancelled`, whether the hacker or an organizer cancelled them.
- **Printing channel:** the Discord channel that receives new-job notices for
  one hackathon.

## Acceptance criteria

- A hacker who is not checked in sees the tab locked, cannot open the page, and
  is refused by the server when submitting.
- A checked-in hacker can submit a job with a description and 1 to 5 accepted
  files, and it appears in their list as `Received`.
- A file over 50 MB, a sixth file, or an unaccepted type is rejected with a
  message naming the reason, and no job is created.
- A hacker sees only their own jobs.
- A hacker can cancel a `Received` or `Needs clarification` job, and cannot
  cancel a job in any other status.
- A user without `PRINTING_QUEUE` or officer access sees no nav item, is
  redirected away from the page, and is refused by every queue action.
- The Blade queue lists jobs oldest first and filters by status, with counts.
- An organizer can open a job, download each file, and see the submitter's
  name, email, phone, Discord username, and cancel count.
- An organizer can set any status and add a note. The hacker sees the new status
  and note on their next load.
- Blade will not save `Needs clarification` without a note.
- New-job notices mention only roles granted `PRINTING_QUEUE`, never roles that
  are officer-only.
- A status change sends the hacker a Discord DM and an email. If either fails,
  the status still changes and the organizer is told which notice failed.
- A new job posts in the configured channel, mentioning the `PRINTING_QUEUE`
  roles, with the submitter's name and submission time.
- Hacker-supplied text in Discord messages cannot produce `@everyone`, `@here`,
  role, or user mentions.
- With no channel configured, or with Discord down, submissions and status
  changes still work.

## Open questions

See `status.md`.
