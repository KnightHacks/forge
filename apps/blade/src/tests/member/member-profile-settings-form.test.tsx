import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { CurrentMember } from "~/hooks/use-member";
import { MemberProfileSettingsForm } from "~/app/_components/member/member-profile-settings-form";
import { getGuildMemberUrl } from "~/lib/guild-urls";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("~/app/_components/auth/sign-out-flow", () => ({
  signOutFromBlade: vi.fn(),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    career: {
      replaceMyEmploymentHistory: {
        useMutation: vi.fn(() => ({
          isPending: false,
          mutateAsync: vi.fn(),
        })),
      },
      updateMyCurrentCity: {
        useMutation: vi.fn(() => ({
          isPending: false,
          mutateAsync: vi.fn(),
        })),
      },
    },
    member: {
      deleteMember: {
        useMutation: vi.fn(() => ({
          isPending: false,
          mutateAsync: vi.fn(),
        })),
      },
      updateMember: {
        useMutation: vi.fn(() => ({
          isPending: false,
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
        })),
      },
    },
    useUtils: vi.fn(() => ({
      career: {
        listMyEmployment: {
          invalidate: vi.fn(),
        },
        searchCompanies: {
          fetch: vi.fn(),
        },
        searchUsCities: {
          fetch: vi.fn(),
        },
      },
      member: {
        getMember: {
          invalidate: vi.fn(),
        },
      },
    })),
  },
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
  }: {
    initialResumeUrl: string | null;
  }) => `Resume widget for ${initialResumeUrl ?? "empty resume"}`,
}));

const member: CurrentMember = {
  about: "I like building member tools.",
  alumniConfirmedAt: null,
  age: 24,
  company: "Knight Hacks",
  currentCityKey: null,
  dateCreated: "2025-05-26",
  discordUser: "casey-member",
  dob: "2000-02-03",
  email: "casey@example.test",
  firstName: "Casey",
  gender: "Prefer not to answer",
  githubProfileUrl: "https://github.com/knighthacks",
  gradDate: "2027-05-02",
  guildProfileVisible: true,
  guildLocationVisible: true,
  guildResumeVisible: true,
  guildOpportunityStatuses: [],
  id: "member-id",
  lastName: "Member",
  levelOfStudy: "Undergraduate University (3+ year)",
  linkedinProfileUrl: "https://www.linkedin.com/company/knight-hacks",
  major: "Computer Science",
  phoneNumber: "321-555-0102",
  points: 0,
  profilePictureUrl: "user-id/avatar.jpg",
  raceOrEthnicity: "Prefer not to answer",
  resumeUrl: "user-id/Resume.pdf",
  school: "University of Central Florida",
  shirtSize: "M",
  tagline: "Member settings tester",
  timeCreated: "01:47:26",
  userId: "user-id",
  websiteUrl: "https://knighthacks.org",
};

const careerData = {
  currentLocation: {
    city: null,
    currentCityKey: null,
    guildLocationVisible: true,
  },
  employment: [],
};

describe("MemberProfileSettingsForm", () => {
  it("renders member settings sections from the member row without signup-only fields", () => {
    const html = renderToStaticMarkup(
      createElement(MemberProfileSettingsForm, { careerData, member }),
    );

    expect(html).toContain("Edit member profile");
    expect(html).toContain('href="/member/dashboard"');
    expect(html).toContain("Open Guild");
    expect(html).toContain("View public profile");
    expect(html).toContain(`href="${getGuildMemberUrl(member.id)}"`);
    expect(html).toContain("Your details");
    expect(html).toContain("Academics");
    expect(html).toContain("Guild profile");
    expect(html).toContain("Career and location");
    expect(html).toContain("Profile picture widget for Casey Member");
    expect(html).toContain("Resume widget for user-id/Resume.pdf");
    expect(html).toContain("Save changes");
    expect(html).toContain("Reset");
    expect(html).toContain("Delete profile");
    expect(html).toContain("Permanently remove your member profile");
    expect(html).toContain('value="Casey"');
    expect(html).toContain('value="casey@example.test"');
    expect(html).toContain("Member settings tester");
    expect(html).not.toContain("Code of Conduct");
    expect(html).not.toContain("I agree to follow");
  });
});
