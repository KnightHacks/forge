import { describe, expect, it, vi } from "vitest";

import {
  canEditHackerProfile,
  persistBeforeOptionalResumeUpload,
  shouldRedirectExistingApplication,
} from "./portal-actions";
import {
  buildDisplayedAgreementInputs,
  requiredAgreementsAccepted,
} from "./portal-agreements";
import { portalFormSchema } from "./portal-form-schema";

const REQUIRED_ID = "00000000-0000-4000-8000-000000000001";
const OPTIONAL_ID = "00000000-0000-4000-8000-000000000002";
const definitions = [
  {
    content: "Required terms",
    contentUrl: null,
    id: REQUIRED_ID,
    key: "required",
    required: true,
    stage: "application" as const,
    title: "Required agreement",
    version: "1",
  },
  {
    content: null,
    contentUrl: "https://example.com/optional",
    id: OPTIONAL_ID,
    key: "optional",
    required: false,
    stage: "application" as const,
    title: "Optional agreement",
    version: "1",
  },
];
const validForm = {
  agreesToMLHCodeOfConduct: false,
  agreesToMLHDataSharing: false,
  agreesToReceiveEmailsFromMLH: false,
  country: "United States of America" as const,
  dob: "2004-02-29",
  email: "hacker@example.com",
  firstName: "Ada",
  foodAllergies: "",
  gender: "Woman" as const,
  githubProfileUrl: "",
  gradDate: "2027-05-01",
  isFirstTime: true,
  lastName: "Lovelace",
  levelOfStudy: "Undergraduate University (3+ year)" as const,
  linkedinProfileUrl: "",
  major: "Computer Science" as const,
  phoneNumber: "555-0100",
  raceOrEthnicity: "Prefer not to answer" as const,
  resumeUrl: "",
  school: "Acadia University" as const,
  shirtSize: "M" as const,
  survey1: "I like building things.",
  survey2: "I want to meet collaborators.",
  websiteUrl: "",
};

describe("KH IX participant actions", () => {
  it("persists a new application before attempting its resume upload", async () => {
    const calls: string[] = [];
    const file = new File(["resume"], "resume.pdf", {
      type: "application/pdf",
    });

    const result = await persistBeforeOptionalResumeUpload({
      file,
      persist: vi.fn(() => {
        calls.push("application");
        return Promise.resolve();
      }),
      uploadResume: vi.fn(() => {
        calls.push("resume");
        return Promise.resolve();
      }),
    });

    expect(calls).toEqual(["application", "resume"]);
    expect(result.resumeError).toBeNull();
  });

  it("keeps a committed save successful when the optional resume fails", async () => {
    const resumeFailure = new Error("storage unavailable");

    const result = await persistBeforeOptionalResumeUpload({
      file: new File(["resume"], "resume.pdf"),
      persist: vi.fn(() => Promise.resolve()),
      uploadResume: vi.fn(() => Promise.reject(resumeFailure)),
    });

    expect(result.resumeError).toBe(resumeFailure);
  });

  it("submits only displayed agreement definitions and preserves optional refusal", () => {
    const choices = { [OPTIONAL_ID]: false, [REQUIRED_ID]: true };

    expect(requiredAgreementsAccepted(definitions, choices)).toBe(true);
    expect(buildDisplayedAgreementInputs(definitions, choices)).toEqual([
      { accepted: true, definitionId: REQUIRED_ID },
      { accepted: false, definitionId: OPTIONAL_ID },
    ]);
  });

  it("uses the SDK date and field limits in the KH IX form", () => {
    expect(portalFormSchema.safeParse(validForm).success).toBe(true);
    expect(
      portalFormSchema.safeParse({ ...validForm, dob: "2004-02-30" }).success,
    ).toBe(false);
    expect(
      portalFormSchema.safeParse({
        ...validForm,
        firstName: "a".repeat(256),
      }).success,
    ).toBe(false);
    expect(
      portalFormSchema.safeParse({
        ...validForm,
        survey1: "a".repeat(5_001),
      }).success,
    ).toBe(false);
  });

  it("accepts usernames and canonicalizes social links before submission", () => {
    const result = portalFormSchema.parse({
      ...validForm,
      githubProfileUrl: "ada-lovelace",
      linkedinProfileUrl: "linkedin.com/in/ada-lovelace",
    });

    expect(result.githubProfileUrl).toBe("https://github.com/ada-lovelace");
    expect(result.linkedinProfileUrl).toBe(
      "https://www.linkedin.com/in/ada-lovelace",
    );
  });

  it("does not redirect a newly committed application during resume upload", () => {
    expect(
      shouldRedirectExistingApplication({
        applicationSubmitted: false,
        existingApplication: true,
        submissionInProgress: true,
      }),
    ).toBe(false);
    expect(
      shouldRedirectExistingApplication({
        applicationSubmitted: false,
        existingApplication: true,
        submissionInProgress: false,
      }),
    ).toBe(true);
  });

  it("requires the server edit_profile action to be allowed", () => {
    expect(
      canEditHackerProfile(true, [{ action: "edit_profile", allowed: false }]),
    ).toBe(false);
    expect(
      canEditHackerProfile(true, [{ action: "edit_profile", allowed: true }]),
    ).toBe(true);
    expect(
      canEditHackerProfile(false, [{ action: "edit_profile", allowed: true }]),
    ).toBe(false);
  });
});
