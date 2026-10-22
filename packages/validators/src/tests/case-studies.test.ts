import { describe, expect, it } from "vitest";

import {
  caseStudyAttributionSchema,
  caseStudyContentSchema,
  caseStudyHttpsUrlSchema,
  caseStudyPublicListSchema,
  caseStudyReviewInputSchema,
  caseStudySlugSchema,
} from "../case-studies";

const content = {
  title: "An accessibility audit tool",
  summary: "A browser tool for finding contrast problems.",
  problem: "Teams struggled to find contrast failures.",
  approach: "We built a local rule engine.",
  implementation: "The rule engine scans the rendered page.",
  outcomes: "We found and fixed several issues.",
  technologies: ["TypeScript"],
  links: { repository: "https://github.com/example/project" },
  images: [
    {
      url: "https://images.example.org/shot.png",
      alt: "Audit report",
      width: 1200,
      height: 800,
    },
  ],
};

describe("case-study contracts", () => {
  it("accepts independent work without event, award, or Devpost data", () => {
    expect(caseStudyContentSchema.safeParse(content).success).toBe(true);
    expect(
      caseStudyContentSchema.safeParse({
        ...content,
        event: { name: "ShellHacks", year: 2025 },
        claims: [{ kind: "award", text: "First place" }],
      }).success,
    ).toBe(true);
  });

  it("bounds content, tags, media, attribution and public page size", () => {
    expect(
      caseStudyContentSchema.safeParse({ ...content, title: "x".repeat(161) })
        .success,
    ).toBe(false);
    expect(
      caseStudyContentSchema.safeParse({
        ...content,
        technologies: Array(21).fill("tag"),
      }).success,
    ).toBe(false);
    expect(
      caseStudyContentSchema.safeParse({
        ...content,
        images: [{ ...content.images[0], alt: "" }],
      }).success,
    ).toBe(false);
    expect(
      caseStudyAttributionSchema.safeParse({
        displayName: "Alice",
        contribution: "Designed it",
        displayScope: "byline",
        email: "alice@example.com",
      }).success,
    ).toBe(false);
    expect(caseStudyPublicListSchema.safeParse({ limit: 25 }).success).toBe(
      false,
    );
    expect(caseStudySlugSchema.safeParse("valid-study").success).toBe(true);
    expect(caseStudySlugSchema.safeParse("Invalid_Slug").success).toBe(false);
  });

  it("rejects executable markup and unsafe or private URLs", () => {
    expect(
      caseStudyContentSchema.safeParse({
        ...content,
        problem: "<script>alert(1)</script>",
      }).success,
    ).toBe(false);
    for (const url of [
      "http://example.com",
      "javascript:alert(1)",
      "https://user:pass@example.com",
      "https://localhost/photo",
      "https://127.0.0.1/photo",
      "https://10.0.0.1/photo",
      "https://192.168.1.1/photo",
      "https://169.254.1.1/photo",
      "https://[fc00::1]/photo",
      "https://[fe80::1]/photo",
      "https://localhost./photo",
      "https://192.0.0.1/photo",
    ]) {
      expect(caseStudyHttpsUrlSchema.safeParse(url).success, url).toBe(false);
    }
    expect(
      caseStudyHttpsUrlSchema.safeParse("https://example.com/photo").success,
    ).toBe(true);
  });

  it("requires editorial eligibility and claim verification for approval", () => {
    const base = {
      revisionId: "00000000-0000-4000-8000-000000000001",
      stage: "editorial",
      outcome: "approve",
      evidenceBasis: "member_record",
      claimsVerified: true,
    };
    expect(caseStudyReviewInputSchema.safeParse(base).success).toBe(false);
    expect(
      caseStudyReviewInputSchema.safeParse({
        ...base,
        eligibility: "unable_to_verify",
      }).success,
    ).toBe(false);
    expect(
      caseStudyReviewInputSchema.safeParse({ ...base, eligibility: "verified" })
        .success,
    ).toBe(true);
    expect(
      caseStudyReviewInputSchema.safeParse({
        ...base,
        stage: "technical",
        eligibility: "verified",
      }).success,
    ).toBe(false);
  });
});
