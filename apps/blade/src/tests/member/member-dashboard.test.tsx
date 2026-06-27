import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { CurrentDuesStatus } from "~/app/_components/member/member-dashboard";
import type { CurrentMember } from "~/hooks/use-member";
import { MemberDashboard } from "~/app/_components/member/member-dashboard";

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
  MemberQRCodeDialog: ({ variant = "desktop" }: { variant?: string }) =>
    `QR widget (${variant})`,
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

const member: CurrentMember = {
  about:
    "My name is Dylan Vidal, and I am the Dev Lead of Knight Hacks. My messages are always open.",
  age: 24,
  company: "Nvidia",
  dateCreated: "2025-05-26",
  discordUser: "dvidal1205",
  dob: "2000-02-03",
  email: "dylan@dvidal.dev",
  firstName: "Dylan",
  gender: "Prefer not to answer",
  githubProfileUrl: "https://github.com/DVidal1205",
  gradDate: "2027-05-02",
  guildProfileVisible: true,
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

describe("MemberDashboard", () => {
  it("renders the Guild social card without legacy member-profile chrome", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, { duesStatus: paidDuesStatus, member }),
    );

    expect(html).toContain("Welcome, Dylan");
    expect(html).toContain("Dylan Vidal");
    expect(html).toContain("Nvidia");
    expect(html).toContain("Members + sponsors");
    expect(html).toContain("GitHub");
    expect(html).toContain("LinkedIn");
    expect(html).toContain("Portfolio");
    expect(html).toContain("Profile picture widget for Dylan Vidal");
    expect(html).toContain("QR widget (desktop)");
    expect(html).toContain("QR widget (mobile)");
    expect(html).toContain("Resume widget for user-id/Resume.pdf (compact)");
    expect(html).toContain("Dues");
    expect(html).toContain("Paid for the 2026-2027 academic school year.");
    expect(html).toContain("Paid");
    expect(html).toContain("bg-[hsl(var(--chart-2)/0.14)]");
    expect(html).toContain("text-[hsl(var(--chart-2))]");
    expect(html).toContain('aria-label="Dues status"');
    expect(html).toContain('href="/member/settings"');
    expect(html).toContain('aria-label="Edit profile"');
    expect(html).not.toContain('href="/member/dues"');
    expect(html).not.toContain("Member profile active");
    expect(html).not.toContain("MEMBER PROFILE");
  });

  it("keeps long Guild bio copy inside an overflow-owned About surface", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, { duesStatus: paidDuesStatus, member }),
    );

    expect(html).toContain("About");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("My name is Dylan Vidal");
  });

  it("renders private Guild visibility with sponsor-only dashboard copy", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, {
        duesStatus: paidDuesStatus,
        member: { ...member, guildProfileVisible: false },
      }),
    );

    expect(html).toContain("Private");
    expect(html).toContain("Sponsors only");
    expect(html).not.toContain("Members + sponsors");
  });

  it("renders unpaid dues as a neutral dashboard action", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, {
        duesStatus: unpaidDuesStatus,
        member,
      }),
    );

    expect(html).toContain(
      "Dues unpaid for the 2026-2027 academic school year.",
    );
    expect(html).toContain("Unpaid");
    expect(html).toContain("Pay dues");
    expect(html).toContain('href="/member/dues"');
    expect(html).toContain("text-muted-foreground");
  });
});
