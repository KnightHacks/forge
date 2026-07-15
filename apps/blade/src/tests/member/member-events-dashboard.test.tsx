import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MemberEventsDashboard } from "~/app/_components/member/member-events-dashboard";

const events = [
  {
    attendanceCount: 12,
    audience: "public" as const,
    description: "Open to every signed-in member.",
    discordUrl:
      "https://discord.com/events/486628710443778071/123456789012345678",
    endAt: "2026-08-12T20:00:00-04:00",
    id: "00000000-0000-4000-8000-000000000701",
    internal: false,
    location: "ENG2 102",
    locked: false,
    lockReason: null,
    name: "Public Workshop",
    points: 10,
    startAt: "2026-08-12T18:00:00-04:00",
    tag: "Workshop",
    tagColor: "#7C3AED",
  },
  {
    attendanceCount: 4,
    audience: "dues" as const,
    description: "A dues-supported member social.",
    discordUrl: null,
    endAt: "2026-08-14T21:00:00-04:00",
    id: "00000000-0000-4000-8000-000000000702",
    internal: false,
    location: "UCF Downtown",
    locked: true,
    lockReason: "dues_required" as const,
    name: "Member Social",
    points: 5,
    startAt: "2026-08-14T19:00:00-04:00",
    tag: "Social",
    tagColor: "#DB2777",
  },
];

const attendance = [
  {
    attendanceCount: 42,
    attendanceId: "00000000-0000-4000-8000-000000000801",
    checkedInAt: null,
    description: "Our spring general body meeting.",
    endAt: "2025-02-10T20:00:00-05:00",
    eventId: "00000000-0000-4000-8000-000000000704",
    location: "HEC 101",
    name: "Spring GBM",
    pointsAwarded: 5,
    startAt: "2025-02-10T18:00:00-05:00",
    tag: "GBM",
    tagColor: "#F59E0B",
  },
  {
    attendanceCount: 42,
    attendanceId: "00000000-0000-4000-8000-000000000802",
    checkedInAt: "2025-02-10T18:05:00-05:00",
    description: "Our spring general body meeting.",
    endAt: "2025-02-10T20:00:00-05:00",
    eventId: "00000000-0000-4000-8000-000000000704",
    location: "HEC 101",
    name: "Spring GBM",
    pointsAwarded: 5,
    startAt: "2025-02-10T18:00:00-05:00",
    tag: "GBM",
    tagColor: "#F59E0B",
  },
];

describe("MemberEventsDashboard", () => {
  it("TC-002 presents useful upcoming event context and safe actions", () => {
    const html = renderToStaticMarkup(
      createElement(MemberEventsDashboard, { attendance, events }),
    );

    expect(html).toContain("Public Workshop");
    expect(html).toContain("Member Social");
    expect(html).toContain("Dues required");
    expect(html).toContain("ENG2 102");
    expect(html).toContain("12 check-ins");
    expect(html).toContain("View description");
    expect(html).toContain("Open to every signed-in member.");
    expect(html).toContain("Open in Discord");
    expect(html).toContain("calendar.google.com/calendar/render");
    expect(html).toContain('href="/member/dashboard"');
    expect(html).toContain("Back to dashboard");
    expect(html).toContain('data-member-events-layout="stacked"');
    expect(html).toContain('href="/member/dues"');
    expect(html).not.toContain("Discord health");
    expect(html).not.toContain("Google health");
  });

  it("TC-004 keeps history informative without migration or empty-time copy", () => {
    const html = renderToStaticMarkup(
      createElement(MemberEventsDashboard, { attendance, events: [] }),
    );

    expect(html).toContain("Attendance history");
    expect(html).toContain("Spring GBM");
    expect(html).toContain("HEC 101");
    expect(html).toContain("42 check-ins");
    expect(html).toContain("5 points");
    expect(html).toContain("Checked in");
    expect(html).not.toContain("Estimated");
    expect(html).not.toContain("Legacy");
    expect(html).not.toContain("unavailable");
    expect(html).not.toContain("Points stay tied");
    expect(html).toContain('data-member-attendance-layout="stacked"');
  });
});
