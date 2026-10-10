# Printing Submission Hours

## Goal

Admins can control whether hackers may submit new 3D printing requests for a hackathon, because the printing team is only available on-site during limited hours.

## Users

- Hackers on the yearly portal printing dashboard.
- Admins with Printing Queue access in Blade.

## User-visible behavior

- Hackers can always view their existing print jobs and the queue summary after check-in.
- Hackers can only upload/submit a new print job while printing submissions are currently open.
- When submissions are closed, the dashboard explains that printing is closed and shows the configured window when one exists.
- Admins can set printing submissions open/closed for the selected hackathon.
- Admins can optionally set an open and/or close time, making the control flexible for same-day on-site blocks or manual open-ended sessions.

## Acceptance criteria

- A missing printing configuration is safe-closed for new submissions.
- Admins can save open/closed state and optional open/close times from the Printing settings dialog.
- Hacker submit and upload API paths reject new order creation while submissions are closed.
- The hacker dashboard disables the New print action while submissions are closed.
- Existing print queue/status/cancel flows keep working while submissions are closed.
