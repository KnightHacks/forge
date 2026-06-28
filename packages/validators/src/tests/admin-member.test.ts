import { describe, expect, it } from "vitest";

import {
  ADMIN_MEMBER_DELETE_CONFIRMATION,
  ADMIN_MEMBER_DUES_INVALIDATION_CONFIRMATION,
  adminMemberDeleteSchema,
  adminMemberListSchema,
  adminMemberMassDuesInvalidationSchema,
  adminMemberPageSizes,
  adminMemberUpdateSchema,
  permissionExpressionSchema,
} from "../admin-member";

describe("admin member contracts", () => {
  it("accepts only the approved page sizes", () => {
    expect(adminMemberPageSizes).toEqual([25, 50, 100, 250, 500]);

    for (const pageSize of adminMemberPageSizes) {
      expect(adminMemberListSchema.parse({ pageSize }).pageSize).toBe(pageSize);
    }

    expect(() => adminMemberListSchema.parse({ pageSize: 10 })).toThrow();
  });

  it("normalizes defaults and supports compound filters", () => {
    expect(
      adminMemberListSchema.parse({
        companies: ["Knight Hacks", "NVIDIA"],
        duesStatuses: ["paid"],
        graduationYears: [2027, 2028],
        guildVisibilities: ["public"],
        page: 2,
        query: "  lenny  ",
        schools: ["University of Central Florida"],
      }),
    ).toMatchObject({
      page: 2,
      pageSize: 25,
      query: "lenny",
      sortDirection: "desc",
      sortField: "joined",
    });
  });

  it("rejects malformed filter values and date ranges", () => {
    expect(() =>
      adminMemberListSchema.parse({ schools: ["Unknown University"] }),
    ).toThrow();
    expect(() =>
      adminMemberListSchema.parse({ joinedFrom: "2026-02-30" }),
    ).toThrow();
    expect(() =>
      adminMemberListSchema.parse({
        joinedFrom: "2026-08-01",
        joinedTo: "2026-07-01",
      }),
    ).toThrow();
  });

  it("allows exactly one typed permission expression", () => {
    expect(permissionExpressionSchema.parse({ or: ["READ_MEMBERS"] })).toEqual({
      or: ["READ_MEMBERS"],
    });
    expect(() => permissionExpressionSchema.parse({ or: [] })).toThrow();
    expect(() =>
      permissionExpressionSchema.parse({ or: ["NOT_A_PERMISSION"] }),
    ).toThrow();
    expect(() =>
      permissionExpressionSchema.parse({
        and: ["READ_MEMBERS"],
        or: ["EDIT_MEMBERS"],
      }),
    ).toThrow();
  });

  it("keeps system-owned and storage fields out of admin profile updates", () => {
    const result = adminMemberUpdateSchema.parse({
      memberId: "00000000-0000-4000-8000-000000000001",
      points: 42,
      profile: {
        about: "Build things.",
        company: "Knight Hacks",
        dob: "2000-02-03",
        email: "lenny@example.test",
        firstName: "Lenny",
        gender: "Prefer not to answer",
        githubProfileUrl: "",
        gradTerm: "Spring",
        gradYear: 2027,
        guildProfileVisible: true,
        lastName: "Dragonson",
        levelOfStudy: "Undergraduate University (3+ year)",
        linkedinProfileUrl: "",
        major: "Computer Science",
        phoneNumber: "",
        profilePictureUrl: "another-user/avatar.png",
        raceOrEthnicity: "Prefer not to answer",
        resumeUrl: "another-user/resume.pdf",
        school: "University of Central Florida",
        shirtSize: "M",
        tagline: "Builder",
        websiteUrl: "",
      },
    });

    expect(result.profile).not.toHaveProperty("profilePictureUrl");
    expect(result.profile).not.toHaveProperty("resumeUrl");
    expect(result).not.toHaveProperty("discordUser");
    expect(result).not.toHaveProperty("dateCreated");
  });

  it("requires exact confirmations for destructive admin operations", () => {
    const memberId = "00000000-0000-4000-8000-000000000001";

    expect(
      adminMemberDeleteSchema.parse({
        confirmation: ADMIN_MEMBER_DELETE_CONFIRMATION,
        memberId,
      }),
    ).toEqual({ confirmation: ADMIN_MEMBER_DELETE_CONFIRMATION, memberId });
    expect(() =>
      adminMemberDeleteSchema.parse({ confirmation: "sure", memberId }),
    ).toThrow();
    expect(
      adminMemberMassDuesInvalidationSchema.parse({
        confirmation: ADMIN_MEMBER_DUES_INVALIDATION_CONFIRMATION,
      }),
    ).toEqual({ confirmation: ADMIN_MEMBER_DUES_INVALIDATION_CONFIRMATION });
    expect(() =>
      adminMemberMassDuesInvalidationSchema.parse({ confirmation: "sure" }),
    ).toThrow();
  });
});
