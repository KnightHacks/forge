# Hackathon Applications Test Cases

Status: Draft pilot spec.

## Test principles

Use setup/action/expected observations. Prefer API or user-flow tests over private implementation details.

## Draft cases

### APP-TC-001: Submit application while open

Setup: A hackathon exists with applications open, an authenticated hacker has required data, and no existing application exists.  
Action: The hacker submits an application.  
Expected: Submission succeeds, one application record exists for the user and hackathon, and the application is visible through the documented read interface.

### APP-TC-002: Reject duplicate application

Setup: A user already has an application for a hackathon.  
Action: The user submits another application for the same hackathon.  
Expected: The request fails with the documented duplicate-application failure class and no second application is created.

### APP-TC-003: Reject closed application window

Setup: A hackathon exists with applications closed.  
Action: An authenticated hacker submits an application.  
Expected: The request fails with the documented closed-window failure class and no application is created.
