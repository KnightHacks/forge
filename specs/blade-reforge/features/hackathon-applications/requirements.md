# Hackathon Applications Requirements

Status: Draft pilot spec.

## Purpose

Define how hackers apply to hackathons using reusable Blade profile data while preserving production data and organizer workflows.

## Depends On

- `../reusable-profiles` (future)
- `../../migration.md`
- `../../interfaces.md`

## Draft requirements

- APP-REQ-001: A hacker SHALL be able to submit one application per hackathon while applications are open.
- APP-REQ-002: A hacker SHALL be able to reuse profile information stored in Blade when applying.
- APP-REQ-003: The system SHALL prevent duplicate active applications for the same user and hackathon.
- APP-REQ-004: Organizer/admin application review needs SHALL remain supported or explicitly replaced.
- APP-REQ-005: Existing production application records SHALL remain queryable or be migrated by an explicit migration rule.

## Non-goals

- Rewriting every admin workflow in the first slice.
- Changing production application data without migration validation.
