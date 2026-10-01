# KHIX Hacker Teams Spec

Status: Approved for implementation

## User-facing purpose

Confirmed hackers form teams of up to four and choose whether to attend in the same class as friends or stagger classes to keep project work moving. These teams are separate from project submissions and judging.

## Users and interface

KHIX dashboard Teams unlocks at confirmation and stays available after check-in. Hackers search by team name or member name, create a named team, or request to join. One team or pending request per hacker per hackathon. Requests are cancellable and do not reserve a seat.

The owner can rename the team, accept or deny requests, remove members, and set together or separate, defaulting to together. Members can leave at any time. Owner departure randomly promotes a remaining member; departure of the last member deletes the team and its requests.

After the first member checks in, freeze new joins and the class preference. Leaving and removal preserve assigned classes. A together team's selected class persists even if the first arrival leaves.

Blade has a Teams page under Hackathon for READ_HACKERS or EDIT_HACKERS. It shows team names, member names, check-in states, and actual classes. EDIT_HACKERS permits rename, removal, and deletion. Owners and organizers receive confirmation before destructive actions.

## Class assignment

Together: assign the first arrival to the least-populated ordinary class, then assign later members to that class without reserving capacity for absent members.

Separate: prefer classes unused by current teammates, then choose the least-populated eligible class. If there are fewer classes than members, distribute team members as evenly as possible before global balance. Individual classes matter, not Bloom/Blight factions. Different classes do not guarantee different event times.

## Out of scope

Invite links, project/judging integration, manual class reassignment, new Discord team roles, organizer join approval, and owner preference overrides after freeze.

## Acceptance criteria

- Confirmation and hackathon isolation are enforced server-side.
- Concurrent approvals cannot exceed four members or give a hacker two teams.
- Only the owner can decide requests or change team settings; organizers have the explicitly granted controls.
- First check-in freezes joins and preference; duplicate check-in does not reassign classes.
- Read-only organizers cannot mutate teams.
- Desktop and mobile KHIX/Blade navigation highlight Teams; locked, empty, loading, and error states are readable.
