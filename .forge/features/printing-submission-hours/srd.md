# Printing Submission Hours SRD

## Scope

Blade printing configuration gains submission availability fields for one hackathon. The 2026 hacker portal consumes the queue DTO to render open/closed state and prevent new submissions.

## Data model

Extend `PrintingConfiguration` with:

- `submissionsEnabled boolean not null default false`
- `submissionsOpenAt timestamptz null`
- `submissionsCloseAt timestamptz null`

A check constraint requires `submissionsOpenAt < submissionsCloseAt` when both are present.

## Open-state rule

`isOpen = submissionsEnabled && (openAt == null || openAt <= now) && (closeAt == null || closeAt > now)`.

Missing configuration uses defaults: disabled, no window, existing print estimate defaults.

## API contracts

- Admin tRPC `printing.getConfiguration` returns submission state.
- Admin tRPC `printing.setSubmissionWindow` saves the enabled flag and nullable open/close timestamps.
- Hacker `listPrintJobs` includes `queue.submissions` with enabled/open/close/isOpen timestamps.
- Hacker `uploadPrintFile` and `submitPrintJob` reject with `PRINTING_CLOSED` when `isOpen` is false.

## UI contracts

- Blade admin settings dialog adds a Printing availability section.
- Hacker printing dashboard shows an open/closed notice and disables New print when closed.

## Rollout

Migration defaults closed for safety. Admins must explicitly open printing for a hackathon.
