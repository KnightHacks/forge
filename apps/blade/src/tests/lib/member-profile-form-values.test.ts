import { describe, expect, it } from "vitest";

import type { MemberProfileFormSource } from "~/lib/member-profile-form-values";
import { memberProfileFormDefaults } from "~/lib/member-profile-form-values";

function source(overrides: Partial<MemberProfileFormSource> = {}) {
  return {
    about: "I like building member tools.",
    age: 24,
    company: "Knight Hacks",
    dateCreated: "2025-05-26",
    discordUser: "casey-member",
    dob: "2000-02-03",
    email: "casey@example.test",
    firstName: "Casey",
    gender: "Prefer not to answer",
    githubProfileUrl: "https://github.com/knighthacks",
    gradDate: "2027-05-02",
    guildOpportunityStatuses: ["internships"],
    guildProfileVisible: true,
    guildResumeVisible: true,
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
    ...overrides,
  } as MemberProfileFormSource;
}

describe("memberProfileFormDefaults", () => {
  it("copies the stored profile onto the form", () => {
    const values = memberProfileFormDefaults(source());

    expect(values.firstName).toBe("Casey");
    expect(values.lastName).toBe("Member");
    expect(values.email).toBe("casey@example.test");
    expect(values.dob).toBe("2000-02-03");
    expect(values.school).toBe("University of Central Florida");
    expect(values.major).toBe("Computer Science");
    expect(values.shirtSize).toBe("M");
    expect(values.guildOpportunityStatuses).toEqual(["internships"]);
  });

  it("splits the stored graduation date into the term and year the form edits", () => {
    const values = memberProfileFormDefaults(source());

    expect(values.gradTerm).toBe("Spring");
    expect(values.gradYear).toBe(2027);
  });

  it("falls back to Spring for a graduation date on no known term boundary", () => {
    expect(
      memberProfileFormDefaults(source({ gradDate: "2026-09-17" })),
    ).toMatchObject({ gradTerm: "Spring", gradYear: 2026 });
  });

  it("turns every nullable column into an empty string so fields stay controlled", () => {
    const values = memberProfileFormDefaults(
      source({
        about: null,
        company: null,
        githubProfileUrl: null,
        linkedinProfileUrl: null,
        phoneNumber: null,
        profilePictureUrl: null,
        resumeUrl: null,
        tagline: null,
        websiteUrl: null,
      }),
    );

    expect(values.about).toBe("");
    expect(values.company).toBe("");
    expect(values.githubProfileUrl).toBe("");
    expect(values.linkedinProfileUrl).toBe("");
    expect(values.phoneNumber).toBe("");
    expect(values.profilePictureUrl).toBe("");
    expect(values.resumeUrl).toBe("");
    expect(values.tagline).toBe("");
    expect(values.websiteUrl).toBe("");
  });

  it("keeps the visibility booleans as booleans, including when false", () => {
    const values = memberProfileFormDefaults(
      source({ guildProfileVisible: false, guildResumeVisible: false }),
    );

    expect(values.guildProfileVisible).toBe(false);
    expect(values.guildResumeVisible).toBe(false);
  });

  it("omits the columns the profile form does not edit", () => {
    const values = memberProfileFormDefaults(source());

    expect(values).not.toHaveProperty("points");
    expect(values).not.toHaveProperty("discordUser");
    expect(values).not.toHaveProperty("gradDate");
    expect(values).not.toHaveProperty("id");
    expect(values).not.toHaveProperty("userId");
  });
});
