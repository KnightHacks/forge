import { describe, expect, it } from "vitest";

import { GUILD } from "@forge/consts";

import {
  guildListProfilesInputSchema,
  guildProfileSchema,
  guildResumeUrlInputSchema,
  updateGuildPreferencesSchema,
} from "../guild";

describe("Guild Collective validation", () => {
  it("applies stable public-directory defaults", () => {
    const input = guildListProfilesInputSchema.parse({
      seed: "00000000-0000-4000-8000-000000000123",
    });

    expect(input.limit).toBe(GUILD.GUILD_DEFAULT_PAGE_SIZE);
    expect(input.memberStatuses).toEqual([]);
    expect(input.memberSinceYears).toEqual([]);
    expect(input.opportunityStatuses).toEqual([]);
    expect(input.teamMembersOnly).toBe(false);
  });

  it("rejects unknown, duplicate, and excessive opportunity statuses", () => {
    expect(
      updateGuildPreferencesSchema.safeParse({
        guildOpportunityStatuses: ["not-a-status"],
      }).success,
    ).toBe(false);
    expect(
      updateGuildPreferencesSchema.safeParse({
        guildOpportunityStatuses: ["internships", "internships"],
      }).success,
    ).toBe(false);
    expect(
      updateGuildPreferencesSchema.safeParse({
        guildOpportunityStatuses: [
          "internships",
          "full-time",
          "freelance-contract",
          "project-collaboration",
        ],
      }).success,
    ).toBe(false);
  });

  it("requires a partial preference update to contain a change", () => {
    expect(updateGuildPreferencesSchema.safeParse({}).success).toBe(false);
    expect(
      updateGuildPreferencesSchema.parse({ guildResumeVisible: false }),
    ).toEqual({ guildResumeVisible: false });
  });

  it("defaults public resume links to inline preview", () => {
    expect(
      guildResumeUrlInputSchema.parse({
        memberId: "00000000-0000-4000-8000-000000000123",
      }).disposition,
    ).toBe("inline");
  });

  it("does not permit storage object names in the public profile DTO", () => {
    const result = guildProfileSchema.safeParse({
      id: "00000000-0000-4000-8000-000000000123",
      firstName: "Lenny",
      lastName: "Dragonson",
      tagline: "Builder",
      about: "Makes things.",
      profilePictureUrl: null,
      school: "University of Central Florida",
      major: "Computer Science",
      gradDate: "2027-05-02",
      memberSinceDate: "2022-09-14",
      company: "Knight Hacks",
      githubProfileUrl: "https://github.com/knighthacks",
      linkedinProfileUrl: null,
      websiteUrl: null,
      resumeAvailable: true,
      resumeUrl: "private/object.pdf",
      opportunityStatuses: ["internships"],
      memberStatus: "current",
      roleCallout: null,
    });

    expect(result.success).toBe(false);
  });
});
