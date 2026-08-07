import { describe, expect, it } from "vitest";

import {
  normalizeSocialProfileUrl,
  optionalSocialProfileUrl,
} from "../social-profile";

describe("social profile links", () => {
  it.each([
    ["knighthacks", "https://github.com/knighthacks"],
    ["@knighthacks", "https://github.com/knighthacks"],
    ["github.com/knighthacks", "https://github.com/knighthacks"],
    [
      "https://www.github.com/knighthacks/?tab=repositories",
      "https://github.com/knighthacks",
    ],
  ])("canonicalizes GitHub input %s", (input, expected) => {
    expect(normalizeSocialProfileUrl(input, "github")).toBe(expected);
  });

  it.each([
    ["dylan-vidal", "https://www.linkedin.com/in/dylan-vidal"],
    ["@dylan-vidal", "https://www.linkedin.com/in/dylan-vidal"],
    ["linkedin.com/in/dylan-vidal", "https://www.linkedin.com/in/dylan-vidal"],
    [
      "https://linkedin.com/company/knight-hacks/?trk=profile",
      "https://www.linkedin.com/company/knight-hacks",
    ],
  ])("canonicalizes LinkedIn input %s", (input, expected) => {
    expect(normalizeSocialProfileUrl(input, "linkedin")).toBe(expected);
  });

  it("rejects another provider's URL and malformed usernames", () => {
    expect(
      optionalSocialProfileUrl("GitHub profile", "github").safeParse(
        "https://linkedin.com/in/someone",
      ).success,
    ).toBe(false);
    expect(normalizeSocialProfileUrl("first last", "linkedin")).toBeNull();
    expect(normalizeSocialProfileUrl("github.com", "github")).toBeNull();
  });

  it("keeps an optional blank value blank", () => {
    expect(optionalSocialProfileUrl("GitHub profile", "github").parse("")).toBe(
      "",
    );
  });
});
