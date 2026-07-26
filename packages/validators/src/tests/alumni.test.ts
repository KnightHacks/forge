import { describe, expect, it } from "vitest";

import {
  alumniBulletinPostSchema,
  alumniGraduationResolutionSchema,
  alumniReorderBulletinPostsSchema,
} from "../alumni";

describe("alumni feature validators", () => {
  it("TC-001 accepts an explicit graduation confirmation", () => {
    expect(
      alumniGraduationResolutionSchema.parse({ resolution: "graduated" }),
    ).toEqual({ resolution: "graduated" });
  });

  it("TC-002 converts an extended graduation term into the canonical date", () => {
    expect(
      alumniGraduationResolutionSchema.parse({
        gradTerm: "Spring",
        gradYear: 2028,
        resolution: "extended",
      }),
    ).toEqual({
      gradDate: "2028-05-02",
      gradTerm: "Spring",
      gradYear: 2028,
      resolution: "extended",
    });
  });

  it("rejects an extended graduation date that is not in the future", () => {
    expect(() =>
      alumniGraduationResolutionSchema.parse({
        gradTerm: "Spring",
        gradYear: 2020,
        resolution: "extended",
      }),
    ).toThrow(/future/i);
  });

  it("TC-010 accepts Markdown, one image, and one external action", () => {
    expect(
      alumniBulletinPostSchema.parse({
        body: "Join us in **Orlando**.",
        ctaLabel: "Volunteer",
        externalUrl: "https://knighthacks.org/volunteer",
        imageAlt: "Knight Hacks volunteers at a community event",
        imageObjectName: "alumni/bulletin/volunteers.webp",
        state: "published",
        title: "Help the next generation",
      }),
    ).toMatchObject({
      body: "Join us in **Orlando**.",
      ctaLabel: "Volunteer",
      externalUrl: "https://knighthacks.org/volunteer",
      imageAlt: "Knight Hacks volunteers at a community event",
      imageObjectName: "alumni/bulletin/volunteers.webp",
      state: "published",
      title: "Help the next generation",
    });
  });

  it("accepts a Blade form as the sole bulletin action", () => {
    expect(
      alumniBulletinPostSchema.parse({
        ctaLabel: "Share your availability",
        formId: "00000000-0000-4000-8000-000000000901",
        state: "draft",
        title: "Judge with us",
      }),
    ).toMatchObject({
      ctaLabel: "Share your availability",
      formId: "00000000-0000-4000-8000-000000000901",
    });
  });

  it.each([
    {
      ctaLabel: "Open",
      externalUrl: "http://example.com",
      state: "draft",
      title: "Insecure",
    },
    {
      ctaLabel: "Open",
      externalUrl: "https://example.com",
      formId: "00000000-0000-4000-8000-000000000901",
      state: "draft",
      title: "Two actions",
    },
    {
      externalUrl: "https://example.com",
      state: "draft",
      title: "Missing action label",
    },
    {
      ctaLabel: "Missing target",
      state: "draft",
      title: "Missing action target",
    },
    {
      imageObjectName: "alumni/bulletin/volunteers.webp",
      state: "draft",
      title: "Missing image description",
    },
    {
      expiresAt: "2026-08-01T00:00:00.000Z",
      publishAt: "2026-09-01T00:00:00.000Z",
      state: "published",
      title: "Backwards schedule",
    },
  ])("rejects an invalid bulletin payload: $title", (payload) => {
    expect(() => alumniBulletinPostSchema.parse(payload)).toThrow();
  });

  it("TC-012 rejects duplicate bulletin identifiers during reordering", () => {
    expect(() =>
      alumniReorderBulletinPostsSchema.parse({
        postIds: [
          "00000000-0000-4000-8000-000000000911",
          "00000000-0000-4000-8000-000000000911",
        ],
      }),
    ).toThrow(/duplicate/i);
  });
});
