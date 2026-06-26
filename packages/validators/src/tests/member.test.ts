import { describe, expect, it } from "vitest";

import {
  calculateMemberAge,
  graduationTermYearFromDate,
  MEMBER_CODE_OF_CONDUCT_URL,
  MEMBER_DASHBOARD_PATH,
  MEMBER_SIGNUP_CALLBACK_PROC,
  MEMBER_SIGNUP_COMPLETION_REDIRECT_URL,
  MEMBER_SIGNUP_FORM_SLUG,
  memberResponseDataFromInput,
  memberSchema,
  memberSettingsFields,
  memberSignupCallbackConnections,
  memberSignupFields,
  memberSignupFormDefinition,
  memberSignupFormJsonSchema,
  memberUpdateSchema,
} from "../member";

const validResponse = {
  firstName: "Lenny",
  lastName: "Dragonson",
  email: "LENNY@KNIGHTHACKS.ORG",
  phoneNumber: "123-456-7890",
  dob: "2000-02-03",
  school: "University of Central Florida",
  levelOfStudy: "Undergraduate University (3+ year)",
  major: "Computer Science",
  gender: "Prefer not to answer",
  raceOrEthnicity: "Prefer not to answer",
  shirtSize: "M",
  gradTerm: "Spring",
  gradYear: 2027,
  company: "",
  githubProfileUrl: "",
  linkedinProfileUrl: "",
  websiteUrl: "https://knighthacks.org",
  profilePictureUrl: "",
  resumeUrl: "",
  tagline: "Builder",
  about: "",
  guildProfileVisible: true,
  codeOfConductAccepted: true,
};

describe("member onboarding validation", () => {
  it("normalizes a valid form response into member-compatible data", () => {
    const result = memberSchema.parse(validResponse);

    expect(result.email).toBe("lenny@knighthacks.org");
    expect(result.phoneNumber).toBe("123-456-7890");
    expect(result.gradDate).toBe("2027-05-02");
    expect(result.company).toBeNull();
    expect(result.resumeUrl).toBeNull();
    expect(result.profilePictureUrl).toBeNull();
  });

  it("keeps an uploaded resume object path", () => {
    const result = memberSchema.parse({
      ...validResponse,
      resumeUrl: "user-id/resume-00000000-0000-4000-8000-000000000000.pdf",
    });

    expect(result.resumeUrl).toBe(
      "user-id/resume-00000000-0000-4000-8000-000000000000.pdf",
    );
  });

  it("keeps an uploaded profile picture object path", () => {
    const result = memberSchema.parse({
      ...validResponse,
      profilePictureUrl:
        "user-id/profile-picture-00000000-0000-4000-8000-000000000000.png",
    });

    expect(result.profilePictureUrl).toBe(
      "user-id/profile-picture-00000000-0000-4000-8000-000000000000.png",
    );
  });

  it("rejects invalid URLs", () => {
    const result = memberSchema.safeParse({
      ...validResponse,
      websiteUrl: "knighthacks.org",
    });

    expect(result.success).toBe(false);
  });

  it("rejects underage members", () => {
    const nextYear = new Date().getUTCFullYear() + 1;
    const result = memberSchema.safeParse({
      ...validResponse,
      dob: `${nextYear}-01-01`,
    });

    expect(result.success).toBe(false);
  });

  it("requires Code of Conduct acceptance", () => {
    const result = memberSchema.safeParse({
      ...validResponse,
      codeOfConductAccepted: false,
    });

    expect(result.success).toBe(false);
  });

  it("validates profile edits without requiring Code of Conduct again", () => {
    const result = memberUpdateSchema.parse({
      ...validResponse,
      codeOfConductAccepted: false,
    });

    expect(result.email).toBe("lenny@knighthacks.org");
    expect(result.gradDate).toBe("2027-05-02");
  });

  it("defines signup fields from editable member data only", () => {
    const fieldNames = new Set<string>(
      memberSignupFields.map((field) => field.name),
    );

    expect(fieldNames).toContain("firstName");
    expect(fieldNames).toContain("guildProfileVisible");
    expect(fieldNames).toContain("profilePictureUrl");
    expect(fieldNames).toContain("resumeUrl");

    for (const serverOwnedField of [
      "id",
      "userId",
      "discordUser",
      "age",
      "points",
      "dateCreated",
      "timeCreated",
    ]) {
      expect(fieldNames.has(serverOwnedField)).toBe(false);
    }
  });

  it("defines settings fields without signup-only or immediate-upload fields", () => {
    const fieldNames = new Set<string>(
      memberSettingsFields.map((field) => field.name),
    );

    expect(fieldNames).toContain("firstName");
    expect(fieldNames).toContain("guildProfileVisible");
    expect(fieldNames).not.toContain("codeOfConductAccepted");
    expect(fieldNames).not.toContain("profilePictureUrl");
    expect(fieldNames).not.toContain("resumeUrl");
  });

  it("keeps the code-owned form definition wired to the member callback", () => {
    expect(memberSignupFormDefinition.slugName).toBe(MEMBER_SIGNUP_FORM_SLUG);
    expect(memberSignupFormDefinition.callbackProc).toBe(
      MEMBER_SIGNUP_CALLBACK_PROC,
    );
    expect(memberSignupFormDefinition.completionRedirectUrl).toBe(
      MEMBER_SIGNUP_COMPLETION_REDIRECT_URL,
    );
    expect(memberSignupFormDefinition.completionRedirectUrl).toBe(
      MEMBER_DASHBOARD_PATH,
    );
    expect(memberSignupCallbackConnections).toHaveLength(
      memberSignupFields.length,
    );
    expect(memberSignupCallbackConnections).toEqual(
      memberSignupFields.map((field) => ({
        formField: field.name,
        procField: field.name,
      })),
    );
  });

  it("requires Code of Conduct acceptance in the form definition", () => {
    const codeOfConductField = memberSignupFields.find(
      (field) => field.name === "codeOfConductAccepted",
    );

    expect(codeOfConductField).toMatchObject({
      description: MEMBER_CODE_OF_CONDUCT_URL,
      kind: "checkbox",
      required: true,
    });
    expect(memberSignupFormJsonSchema.required).toContain(
      "codeOfConductAccepted",
    );
    expect(memberSignupFormJsonSchema.additionalProperties).toBe(false);
  });

  it("calculates age before and after birthday boundaries", () => {
    const referenceDate = new Date("2026-06-25T12:00:00Z");

    expect(calculateMemberAge("2000-06-24", referenceDate)).toBe(26);
    expect(calculateMemberAge("2000-06-26", referenceDate)).toBe(25);
  });

  it("serializes saved member data back into signup response shape", () => {
    const member = memberSchema.parse(validResponse);
    const responseData = memberResponseDataFromInput(member, {
      codeOfConductAccepted: true,
    });

    expect(responseData).toMatchObject({
      codeOfConductAccepted: true,
      gradTerm: "Spring",
      gradYear: 2027,
      phoneNumber: "123-456-7890",
    });
  });

  it("derives graduation term and year from stored graduation dates", () => {
    expect(graduationTermYearFromDate("2027-12-10")).toEqual({
      gradTerm: "Fall",
      gradYear: 2027,
    });
  });
});
