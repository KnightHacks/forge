# KHIX Hacker Teams Test Cases

Status: Approved behavior

- Unconfirmed or wrong-hackathon participant reads/mutations fail; confirmed and checked-in users can view.
- Create joins the creator as owner; a second team or request is rejected. Cancelled or denied requests permit another request.
- Search matches team or member names without exposing emails; requests are owner-only.
- Owner accepts/denies; a non-owner cannot. Concurrent final-seat approvals produce exactly four accepted members. Pending requests do not consume capacity.
- Member departure preserves others. Owner departure randomly chooses one remaining accepted member; the last departure deletes the team and pending requests.
- Owner can rename/remove members, but cannot remove another team's member. Read-only organizer mutations fail; editor rename/remove/delete succeed and audit.
- First check-in of a together team uses the lowest-count class and freezes joins/preferences. Later arrivals share it even when first arrival leaves. Concurrent first arrivals agree.
- Separate arrivals use distinct classes while available, crossing factions; with too few classes, balance teammate occupancy before global count. Solo check-in keeps existing behavior.
- Check-in racing with approval or preference update has a serial outcome. Duplicate check-in preserves assignment and awards points once.
- Leaving after check-in preserves class and Discord grants. Rejoining/creating after check-in is rejected. Team deletion never clears existing classes.
- Application deletion removes team membership and preserves a valid owner or deletes an empty team.
- Fresh migrations and sanitized backups handle both new tables. Existing event/VIP check-in tests remain green.
- Real desktop/mobile browser: locked Teams page, create, search, request/cancel, owner approve/deny, preference help, full/frozen state, leave/succession, Blade read/edit controls and highlighted navigation. Capture screenshots as PR attachments.
