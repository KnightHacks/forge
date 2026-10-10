# Printing Submission Hours Test Cases

- TC-001: Missing printing configuration returns submissions disabled and closed while preserving default queue estimates.
- TC-002: Admin with Printing Queue permission can save submissions enabled with an optional open/close window; configuration reads back the exact state.
- TC-003: Checked-in hacker can submit and upload while submissions are enabled and the current time is within the optional window.
- TC-004: Checked-in hacker cannot upload or submit while submissions are disabled.
- TC-005: Checked-in hacker cannot upload or submit before a future open time or after a close time.
- TC-006: Existing job listing and cancellation still work while submissions are closed.
- TC-007: Hacker portal disables the New print action and explains closed/open-window state when queue submissions are closed.
