# Judging Challenge Mode Spec

Status: Accepted

> This file owns the non-technical user/product intent. Do not fill it from guesses. Use reverse-prompting to clarify it with the human.

## User-facing purpose

Organizers must be able to choose how each judging challenge reaches hackers. A challenge can use a timed appointment, remain visible as an untimed location, or be judged remotely without appearing on the hacker itinerary.

## Users / actors

- Organizers configure challenge judging modes in Blade.
- Judges evaluate scheduled, unscheduled, and remote challenges.
- Hackers see scheduled appointments and visible unscheduled locations, but never remote challenges.

## User-visible interface

Replace the **On hacker schedule** checkbox in challenge configuration with a **Judging mode** dropdown:

- **Scheduled**: the default. The challenge receives time and location appointments and appears on the hacker itinerary.
- **Unscheduled**: the challenge appears on the hacker itinerary as an unscheduled location with no appointment time.
- **Remote**: the challenge does not appear on the hacker itinerary. Judges review and score it without an appointment.

Collapsed child challenges inherit their parent group's mode and cannot override it.

## Scope

### In scope

- Three judging modes in challenge configuration.
- Remote challenges omitted from hacker-facing judging data.
- Remote challenges available to authorized judges as untimed evaluations.
- Existing scheduled and unscheduled challenge behavior preserved.

### Out of scope

- Changing judging permissions, assignments, rubrics, or judging lifecycle controls.
- Importing submissions from Devpost or automating remote review.
- Giving hackers a separate remote-judging status.

## Vocabulary

- `Scheduled`: appointment-based judging with a time and location.
- `Unscheduled`: hacker-visible, walk-up judging without an appointment.
- `Remote`: judge-visible evaluation that is absent from the hacker itinerary.

## Acceptance criteria

- New challenges default to Scheduled.
- Organizers can select Scheduled, Unscheduled, or Remote for a standalone challenge or group.
- An Unscheduled challenge appears to hackers with the existing “Unscheduled” presentation.
- A Remote challenge appears nowhere on the hacker judging itinerary.
- A Remote challenge remains available to an authorized judge and its response form is editable at any time while judging is open, without requiring a current appointment.
- Scheduled challenges retain their appointment timing and location behavior.
- Collapsed child challenges follow the parent group's selected mode.

## Open questions

- None. The user explicitly supplied the three modes and confirmed that remote judging should be available to judges without a scheduled time.
