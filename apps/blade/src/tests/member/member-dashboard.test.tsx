import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { CurrentDuesStatus } from "~/app/_components/member/member-dashboard";
import type { CurrentMember } from "~/hooks/use-member";
import { MemberDashboard } from "~/app/_components/member/member-dashboard";
import { getGuildMemberUrl, GUILD_URL } from "~/lib/guild-urls";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("~/app/_components/member/member-profile-picture-upload", () => ({
  MemberProfilePictureUpload: ({
    displayName,
  }: {
    displayName: string;
    initialProfilePictureUrl: string | null;
  }) => `Profile picture widget for ${displayName}`,
}));

vi.mock("~/app/_components/member/member-qr-code-dialog", () => ({
  MemberQRCodeDialog: ({ label = "QR code" }: { label?: string }) =>
    `QR widget (${label})`,
}));

vi.mock("~/app/_components/member/member-resume-upload", () => ({
  MemberResumeUpload: ({
    initialResumeUrl,
    variant,
  }: {
    initialResumeUrl: string | null;
    variant?: string;
  }) =>
    `Resume widget for ${initialResumeUrl ?? "empty resume"} (${variant ?? "panel"})`,
}));

vi.mock("~/app/_components/member/member-event-feedback", () => ({
  MemberEventFeedback: ({
    opportunity,
    surface,
  }: {
    opportunity: { eventName: string; status: string };
    surface: string;
  }) =>
    `Feedback for ${opportunity.eventName} (${opportunity.status}, ${surface})`,
}));

vi.mock("~/app/_components/member/guild-preferences-dialog", () => ({
  GuildPreferencesDialog: () => "Guild preferences",
}));

const member: CurrentMember = {
  about:
    "My name is Dylan Vidal, and I am the Dev Lead of Knight Hacks. My messages are always open.",
  alumniConfirmedAt: null,
  age: 24,
  company: "Nvidia",
  currentCityKey: null,
  dateCreated: "2025-05-26",
  discordUser: "dvidal1205",
  dob: "2000-02-03",
  email: "dylan@dvidal.dev",
  firstName: "Dylan",
  gender: "Prefer not to answer",
  githubProfileUrl: "https://github.com/DVidal1205",
  gradDate: "2027-05-02",
  guildProfileVisible: true,
  guildLocationVisible: true,
  guildResumeVisible: true,
  guildOpportunityStatuses: [],
  id: "member-id",
  lastName: "Vidal",
  levelOfStudy: "Undergraduate University (3+ year)",
  linkedinProfileUrl: "https://www.linkedin.com/in/dylanvidal1204/",
  major: "Computer Science",
  phoneNumber: "123-456-7890",
  points: 0,
  profilePictureUrl: "user-id/avatar.jpg",
  raceOrEthnicity: "Prefer not to answer",
  resumeUrl: "user-id/Resume.pdf",
  school: "University of Central Florida",
  shirtSize: "M",
  tagline: "Dev Lead @ Knight Hacks | SWE Intern @ NVIDIA | GHCE",
  timeCreated: "01:47:26",
  userId: "user-id",
  websiteUrl: "https://dvidal.dev",
};

const paidDuesStatus = {
  amountDue: 2500,
  amountDueLabel: "$25.00",
  amountPaid: 2500,
  currentAcademicYear: {
    endYear: 2027,
    label: "2026-2027 academic school year",
    shortLabel: "2026-2027",
    startYear: 2026,
  },
  currentYearHasStaleDues: false,
  lateYearWarning: false,
  paid: true,
  paidAt: new Date("2026-08-15T12:00:00Z"),
  paymentsLocked: false,
  payableAcademicYear: {
    endYear: 2027,
    label: "2026-2027 academic school year",
    shortLabel: "2026-2027",
    startYear: 2026,
  },
  paymentAcademicYear: {
    endYear: 2027,
    label: "2026-2027 academic school year",
    shortLabel: "2026-2027",
    startYear: 2026,
  },
  paymentId: "dues-payment-id",
  state: "paid",
  stripePaymentIntentId: "pi_paid",
} as CurrentDuesStatus;

const unpaidDuesStatus = {
  ...paidDuesStatus,
  amountPaid: null,
  paid: false,
  paidAt: null,
  paymentId: null,
  state: "unpaid",
  stripePaymentIntentId: null,
} as CurrentDuesStatus;

const events = [
  {
    attendanceCount: 8,
    audience: "public" as const,
    description: "Practice your technical interview skills.",
    discordUrl: null,
    endAt: "2026-08-12T20:00:00-04:00",
    id: "00000000-0000-4000-8000-000000000701",
    internal: false,
    location: "ENG2 102",
    locked: false,
    lockReason: null,
    name: "Interview Workshop",
    points: 10,
    startAt: "2026-08-12T18:00:00-04:00",
    tag: "Workshop",
    tagColor: "#7C3AED",
  },
];

const attendance = Array.from({ length: 4 }, (_, index) => ({
  attendanceCount: 20 + index,
  attendanceId: `00000000-0000-4000-8000-${String(index + 801).padStart(12, "0")}`,
  checkedInAt: index === 0 ? null : `2026-0${4 - index}-10T18:05:00-04:00`,
  description: "Member event",
  endAt: `2026-0${4 - index}-10T20:00:00-04:00`,
  eventId: `00000000-0000-4000-8000-${String(index + 704).padStart(12, "0")}`,
  location: "HEC 101",
  name: `Recent Event ${index + 1}`,
  pointsAwarded: 5,
  startAt: `2026-0${4 - index}-10T18:00:00-04:00`,
  tag: "GBM",
  tagColor: "#F59E0B",
}));

const dashboardProps = {
  attendance,
  duesStatus: paidDuesStatus,
  events,
  member,
};

function occurrences(html: string, needle: string) {
  return html.split(needle).length - 1;
}

describe("MemberDashboard", () => {
  it("surfaces immediately available feedback on the upcoming dashboard card", () => {
    const firstEvent = events[0];
    if (!firstEvent) throw new Error("Missing event fixture.");
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, {
        ...dashboardProps,
        feedback: [
          {
            customQuestions: [],
            dueAt: "2026-08-19T20:00:00-04:00",
            eventId: firstEvent.id,
            eventName: firstEvent.name,
            formId: "00000000-0000-4000-8000-000000000901",
            rewardPoints: 5,
            status: "available" as const,
            urgent: false,
          },
        ],
      }),
    );

    expect(html).toContain(
      "Feedback for Interview Workshop (available, dashboard)",
    );
  });

  it("renders the Guild social card without legacy member-profile chrome", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, dashboardProps),
    );

    expect(html).toContain("Welcome, Dylan");
    expect(html).toContain("Dylan Vidal");
    expect(html).toContain("Nvidia");
    expect(html).toContain("Public on Guild");
    expect(html).toContain("View Guild profile");
    expect(html).toContain(`href="${getGuildMemberUrl(member.id)}"`);
    expect(html).toContain("Guild preferences");
    expect(html).toContain("GitHub");
    expect(html).toContain("LinkedIn");
    expect(html).toContain("Portfolio");
    expect(html).toContain("Profile picture widget for Dylan Vidal");
    expect(html).toContain("QR widget (View QR code)");
    expect(html).toContain("Resume widget for user-id/Resume.pdf (compact)");
    expect(html).toContain("Paid");
    expect(html).toContain('href="/member/settings"');
    expect(html).toContain('aria-label="Edit profile"');
    expect(html).not.toContain('href="/member/dues"');
    expect(html).not.toContain("Member profile active");
    expect(html).not.toContain("MEMBER PROFILE");
    expect(html).toContain("Interview Workshop");
    expect(html).toContain("Recent Event 1");
    expect(html).toContain("Recent Event 3");
    expect(html).not.toContain("Recent Event 4");
    expect(html).toContain('href="/member/events"');
    expect(html).not.toContain("Member info");
    expect(html).not.toContain("Academics");
  });

  it("renders the Guild bio copy in the About section", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, dashboardProps),
    );

    expect(html).toContain("About");
    expect(html).toContain("My name is Dylan Vidal");
  });

  it("renders a hidden Guild profile without implying private sponsor access", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, {
        duesStatus: paidDuesStatus,
        attendance,
        events,
        member: { ...member, guildProfileVisible: false },
      }),
    );

    expect(html).toContain("Private");
    expect(html).toContain("Hidden from Guild");
    expect(html).toContain(
      "it stays hidden from Guild until you turn visibility on.",
    );
    expect(html).toContain("Explore Guild");
    expect(html).toContain(`href="${GUILD_URL}"`);
    expect(html).not.toContain("Sponsors only");
  });

  it("keeps the dashboard usable when event information is unavailable", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, {
        ...dashboardProps,
        attendance: [],
        events: [],
        eventsUnavailable: true,
      }),
    );

    expect(html).toContain("Dylan Vidal");
    expect(html).toContain("Dues paid for the 2026-2027 academic school year.");
    expect(html).toContain("Event information is temporarily unavailable");
    expect(html).not.toContain("No upcoming events right now.");
  });

  it("keeps the unpaid dues banner and its payment action prominent (TC-006)", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, {
        duesStatus: unpaidDuesStatus,
        attendance,
        events,
        member,
      }),
    );

    expect(html).toContain(
      "Dues unpaid for the 2026-2027 academic school year.",
    );
    expect(html).toContain("Unpaid");
    expect(html).toContain("Pay dues");
    expect(html).toContain('href="/member/dues"');
    expect(occurrences(html, 'aria-label="Dues status"')).toBe(1);
    expect(html).not.toContain("Dues paid for the");

    const welcomeIndex = html.indexOf("Welcome, Dylan");
    const duesIndex = html.indexOf('aria-label="Dues status"');
    const eventsIndex = html.indexOf('aria-label="Events overview"');
    expect(welcomeIndex).toBeLessThan(duesIndex);
    expect(duesIndex).toBeLessThan(eventsIndex);
  });

  it("replaces the paid dues tile with a badge beside the welcome name (TC-006)", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, dashboardProps),
    );

    expect(html).not.toContain('aria-label="Dues status"');
    expect(html).not.toContain("Paid for the 2026-2027 academic school year.");
    expect(html).toContain(
      'aria-label="Dues paid for the 2026-2027 academic school year."',
    );
    expect(html).toContain("Paid");

    const welcomeIndex = html.indexOf("Welcome, Dylan");
    const badgeIndex = html.indexOf('aria-label="Dues paid for the');
    expect(welcomeIndex).toBeLessThan(badgeIndex);
    expect(badgeIndex).toBeLessThan(html.indexOf('aria-label="Check in"'));
  });

  it("renders one shared section order with no per-viewport duplicates (TC-007)", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, dashboardProps),
    );

    for (const marker of [
      "Welcome, Dylan",
      'aria-label="Check in"',
      'aria-label="Events overview"',
      "Previous forms",
      'aria-label="Company"',
      'aria-label="Guild profile"',
      "Guild preferences",
    ]) {
      expect(occurrences(html, marker)).toBe(1);
    }

    const order = [
      "Welcome, Dylan",
      'aria-label="Check in"',
      'aria-label="Events overview"',
      "Previous forms",
      'aria-label="Guild profile"',
    ].map((marker) => html.indexOf(marker));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("offers check in and a View QR code action once (TC-007)", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, dashboardProps),
    );

    expect(html).toContain('aria-label="Check in"');
    expect(html).toContain(
      "Show this code at the door to check in to a Knight Hacks event.",
    );
    expect(occurrences(html, "QR widget (View QR code)")).toBe(1);
  });

  it("explains Guild and marks its public action as external (TC-008)", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, dashboardProps),
    );

    expect(html).toContain(
      "Guild is the public Knight Hacks member directory.",
    );
    expect(html).toContain("anyone on Guild can see it.");
    expect(html).toContain(
      "Your dues, check in, events, and forms stay private to Blade.",
    );
    expect(html).toContain("(opens in a new tab)");
    expect(html).toContain('target="_blank"');
  });

  it("renders the admin-paused dues state without a pay link", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, {
        duesStatus: { ...unpaidDuesStatus, paymentsLocked: true },
        attendance,
        events,
        member,
      }),
    );

    expect(html).toContain("Dues payments are paused until further notice");
    expect(html).toContain("Payments paused");
    expect(html).toContain("Paused");
    expect(html).not.toContain('href="/member/dues"');
  });
});
