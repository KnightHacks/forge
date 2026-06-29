import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MemberEventsDashboard } from "~/app/_components/member/member-events-dashboard";

const events = [
  {
    audience: "public" as const,
    description: "Open to every signed-in member.",
    endDateTime: "2026-08-12T20:00:00-04:00",
    id: "00000000-0000-4000-8000-000000000701",
    internal: false,
    location: "ENG2 102",
    locked: false,
    name: "Public Workshop",
    startDateTime: "2026-08-12T18:00:00-04:00",
    tag: "Workshop",
    tagColor: "#7C3AED",
  },
  {
    audience: "dues" as const,
    description: "A dues-supported member social.",
    endDateTime: "2026-08-14T21:00:00-04:00",
    id: "00000000-0000-4000-8000-000000000702",
    internal: false,
    location: "UCF Downtown",
    locked: true,
    name: "Member Social",
    startDateTime: "2026-08-14T19:00:00-04:00",
    tag: "Social",
    tagColor: "#DB2777",
  },
  {
    audience: "roles" as const,
    description: "Operations planning.",
    endDateTime: "2026-08-15T20:00:00-04:00",
    id: "00000000-0000-4000-8000-000000000703",
    internal: true,
    location: "Discord",
    locked: false,
    name: "Internal Planning",
    startDateTime: "2026-08-15T18:00:00-04:00",
    tag: "OPS",
    tagColor: "#2563EB",
  },
];

const attendance = [
  {
    attendanceId: "00000000-0000-4000-8000-000000000801",
    checkedInAt: null,
    eventId: "00000000-0000-4000-8000-000000000704",
    eventName: "Legacy GBM",
    estimated: true,
    pointsAwarded: 5,
    startDateTime: "2025-02-10T18:00:00-05:00",
    tag: "GBM",
    tagColor: "#F59E0B",
  },
  {
    attendanceId: "00000000-0000-4000-8000-000000000802",
    checkedInAt: "2025-02-10T18:05:00-05:00",
    eventId: "00000000-0000-4000-8000-000000000704",
    eventName: "Legacy GBM",
    estimated: false,
    pointsAwarded: 5,
    startDateTime: "2025-02-10T18:00:00-05:00",
    tag: "GBM",
    tagColor: "#F59E0B",
  },
];

describe("MemberEventsDashboard", () => {
  it("TC-002 shows eligible events and a visible dues lock", () => {
    const html = renderToStaticMarkup(
      createElement(MemberEventsDashboard, { attendance, events }),
    );

    expect(html).toContain("Public Workshop");
    expect(html).toContain("Member Social");
    expect(html).toContain("Internal Planning");
    expect(html).toContain("Dues required");
    expect(html).toContain("Pay dues");
    expect(html).toContain('href="/member/dues"');
    expect(html).not.toContain("Discord health");
    expect(html).not.toContain("Google health");
    expect(html).not.toContain("Selected role IDs");
  });

  it("TC-004 TC-029 labels estimated legacy attendance history", () => {
    const html = renderToStaticMarkup(
      createElement(MemberEventsDashboard, { attendance, events: [] }),
    );

    expect(html).toContain("Attendance history");
    expect(html).toContain("Legacy GBM");
    expect(html).toContain("5 points");
    expect(html).toContain("Estimated");
    expect(html).toContain("Legacy check-in time unavailable");
    expect(html).toContain("Checked in");
    expect(html.match(/Legacy GBM/g)).toHaveLength(2);
  });
});
