import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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

describe("MemberDashboard", () => {
  it("renders the Guild social card without legacy member-profile chrome", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, { member }),
    );

    expect(html).toContain("Welcome, Dylan");
    expect(html).toContain("Dylan Vidal");
    expect(html).toContain("Nvidia");
    expect(html).toContain("Members + sponsors");
    expect(html).toContain("GitHub");
    expect(html).toContain("LinkedIn");
    expect(html).toContain("Portfolio");
    expect(html).toContain("Profile picture widget for Dylan Vidal");
    expect(html).toContain("Resume widget for user-id/Resume.pdf (compact)");
    expect(html).toContain('href="/member/settings"');
    expect(html).toContain('aria-label="Edit profile"');
    expect(html).not.toContain("Member profile active");
    expect(html).not.toContain("MEMBER PROFILE");
  });

  it("keeps long Guild bio copy inside an overflow-owned About surface", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, { member }),
    );

    expect(html).toContain("About");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("My name is Dylan Vidal");
  });

  it("renders private Guild visibility with sponsor-only dashboard copy", () => {
    const html = renderToStaticMarkup(
      createElement(MemberDashboard, {
        member: { ...member, guildProfileVisible: false },
      }),
    );

    expect(html).toContain("Private");
    expect(html).toContain("Sponsors only");
    expect(html).not.toContain("Members + sponsors");
  });
});
