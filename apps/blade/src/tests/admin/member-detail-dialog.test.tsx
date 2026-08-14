import type { ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { MemberDetailDialog } from "~/app/_components/admin/members/member-detail-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("~/app/_components/member/member-profile-settings-form", () => ({
  memberProfileFormDefaults: vi.fn(),
  MemberSettingsFieldControl: () => null,
}));

vi.mock("@forge/ui/dialog", async () => {
  const { createElement } = await import("react");
  const Container = ({ children }: { children: ReactNode }) =>
    createElement("div", null, children);

  return {
    Dialog: ({ children }: { children: ReactNode }) =>
      createElement("div", { role: "dialog" }, children),
    DialogClose: Container,
    DialogContent: Container,
    DialogDescription: Container,
    DialogFooter: Container,
    DialogHeader: Container,
    DialogTitle: Container,
    DialogTrigger: Container,
  };
});

vi.mock("~/trpc/react", () => ({
  api: (() => {
    const mutation = () => ({
      isPending: false,
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
    });
    return {
      memberAdmin: {
        accessAdminMemberResume: { useMutation: mutation },
        deleteAdminMember: { useMutation: mutation },
        removeAdminProfilePicture: { useMutation: mutation },
        removeAdminResume: { useMutation: mutation },
        setAdminDuesStatus: { useMutation: mutation },
        updateAdminMember: { useMutation: mutation },
        uploadAdminProfilePicture: { useMutation: mutation },
        uploadAdminResume: { useMutation: mutation },
      },
    };
  })(),
}));

const detail = {
  discord: {
    activity: [
      { count: 4, date: "2026-06-27" },
      { count: 8, date: "2026-07-16" },
    ],
    activityEndDate: "2026-07-16",
    activeChannelCount: 3,
    activeDayCount: 12,
    currentStreakDays: 4,
    firstMessageAt: new Date("2025-09-01T12:00:00Z"),
    lastMessageAt: new Date("2026-07-16T11:00:00Z"),
    longestStreakDays: 9,
    messageCount: 124,
    topChannels: [
      { count: 80, isThread: false, name: "general" },
      { count: 44, isThread: true, name: "project-help" },
    ],
  },
  duesHistory: [
    {
      amount: 2500,
      paidAt: new Date("2026-06-27T12:00:00Z"),
      source: "Stripe",
      year: 2025,
    },
  ],
  duesStatus: {
    amountDueLabel: "$25.00",
    amountPaid: 2500,
    currentAcademicYear: { shortLabel: "2025-2026" },
    paid: true,
    paidAt: new Date("2026-06-27T12:00:00Z"),
    paymentAcademicYear: { shortLabel: "2025-2026" },
  },
  graduated: false,
  employment: [
    {
      city: {
        key: "12-53000",
        label: "Orlando, FL",
        latitude: 28.5383,
        longitude: -81.3792,
        name: "Orlando",
        state: "FL",
      },
      cityKey: "12-53000",
      company: { displayName: "Knight Hacks", reviewState: "approved" },
      endMonth: null,
      experienceType: "full_time",
      guildVisible: true,
      id: "00000000-0000-4000-8000-000000000010",
      startMonth: "2025-06",
      state: "current",
      title: "Platform Engineer",
      updatedAt: new Date("2026-07-01T12:00:00Z"),
    },
  ],
  engagement: {
    distinctEventCount: 1,
    eventCheckInCount: 1,
    eventPointsAwarded: 20,
  },
  events: [
    {
      attendanceId: "00000000-0000-4000-8000-000000000011",
      checkedInAt: new Date("2026-07-10T22:05:00Z"),
      checkedInBy: "admin-user",
      endAt: new Date("2026-07-11T00:00:00Z"),
      eventId: "00000000-0000-4000-8000-000000000012",
      location: "ENG2 Atrium",
      name: "TypeScript Workshop",
      pointsAwarded: 20,
      pointsAwardedEstimated: false,
      startAt: new Date("2026-07-10T22:00:00Z"),
      tag: "Workshop",
    },
  ],
  guildLocation: {
    key: "12-53000",
    label: "Orlando, FL",
    latitude: 28.5383,
    longitude: -81.3792,
    name: "Orlando",
    state: "FL",
  },
  member: {
    about: "Build useful tools.",
    age: 25,
    alumniConfirmedAt: null,
    company: "Knight Hacks",
    currentCityKey: "12-53000",
    dateCreated: "2026-06-27",
    discordUser: "lenny-dragon",
    dob: "2001-02-03",
    email: "lenny@example.test",
    firstName: "Lenny",
    gender: "Prefer not to answer",
    githubProfileUrl: "https://github.com/knighthacks",
    gradDate: "2027-05-02",
    guildLocationVisible: true,
    guildOpportunityStatuses: ["offering-mentorship"],
    guildProfileVisible: true,
    guildResumeVisible: true,
    id: "00000000-0000-4000-8000-000000000001",
    lastName: "Dragonson",
    levelOfStudy: "Undergraduate University (3+ year)",
    linkedinProfileUrl: "https://linkedin.com/company/knight-hacks",
    major: "Computer Science",
    phoneNumber: "407-555-0100",
    points: 50,
    profilePictureUrl: "user/profile.png",
    raceOrEthnicity: "Prefer not to answer",
    resumeUrl: "user/resume.pdf",
    school: "University of Central Florida",
    shirtSize: "M",
    tagline: "Builder",
    timeCreated: "12:00:00",
    userId: "00000000-0000-4000-8000-000000000002",
    websiteUrl: "https://knighthacks.org",
  },
  profilePictureUrl: "https://signed.example.test/profile.png",
  roles: [
    { color: "#6D28D9", name: "Development" },
    { color: null, name: "Member" },
  ],
} as RouterOutputs["memberAdmin"]["getAdminMember"];

describe("MemberDetailDialog", () => {
  it("omits every mutation control for readers", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDetailDialog, {
        canEdit: false,
        detail,
        onChanged: vi.fn(),
        onClose: vi.fn(),
        onDeleted: vi.fn(),
      }),
    );

    expect(html).toContain("Lenny Dragonson");
    expect(html).toContain("lenny@example.test");
    expect(html).not.toContain("Edit member");
    expect(html).not.toContain("Revoke dues");
    expect(html).not.toContain("Delete member");
    expect(html).toContain("Profile files");
    expect(html).toContain("View resume");
    expect(html).toContain("Event engagement");
    expect(html).toContain("Discord engagement");
    expect(html).toContain("Current streak");
    expect(html).toContain("Longest streak");
    expect(html).toContain("9 days");
    expect(html).toContain("Employment history");
    expect(html).toContain("Roles");
    expect(html).toContain("TypeScript Workshop");
    expect(html).toContain("Platform Engineer");
    expect(html).toContain("Development");
    expect(html).toContain("Jun 27, 2026");
    expect(html).toContain("July 2026");
    expect(html).toContain('aria-label="Previous month"');
    expect(html).toContain('aria-label="Next month"');
    expect(html).not.toContain("Latest 30");
    expect(html).not.toContain("Member ID");
    expect(html).not.toContain("User ID");
    expect(html).not.toContain("signed.example.test/resume.pdf");
    expect(html).not.toContain(">Replace<");
    expect(html).not.toContain(">Upload<");
    expect(html).not.toContain("Remove resume");
  });

  it("shows edit, files, dues, and delete controls for editors", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDetailDialog, {
        canEdit: true,
        detail,
        onChanged: vi.fn(),
        onClose: vi.fn(),
        onDeleted: vi.fn(),
      }),
    );

    expect(html).toContain("Edit member");
    expect(html).toContain("Revoke dues");
    expect(html).toContain("Profile files");
    expect(html).toContain("View resume");
    expect(html).toContain("Delete member");
  });

  it("organizes the profile into a clear desktop and mobile information hierarchy", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDetailDialog, {
        canEdit: true,
        detail,
        onChanged: vi.fn(),
        onClose: vi.fn(),
        onDeleted: vi.fn(),
      }),
    );

    expect(html).toContain("Membership &amp; dues");
    expect(html).toContain("Contact &amp; identity");
    expect(html).toContain("Academics &amp; work");
    expect(html).toContain("Guild profile");
    expect(html).toContain("Profile files");
    expect(html).toContain("Record details");
  });
});
