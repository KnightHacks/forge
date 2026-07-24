import { describe, expect, it } from "vitest";

import {
  normalizePublicGuildText,
  normalizePublicGuildUrl,
} from "../../utils/guild/public-profile";

describe("Guild public profile projection", () => {
  it("normalizes blank legacy text to one missing-value representation", () => {
    expect(normalizePublicGuildText(null)).toBeNull();
    expect(normalizePublicGuildText("")).toBeNull();
    expect(normalizePublicGuildText("   ")).toBeNull();
    expect(normalizePublicGuildText("  Builder  ")).toBe("Builder");
  });

  it("normalizes safe legacy web links", () => {
    expect(normalizePublicGuildUrl("knighthacks.org")).toBe(
      "https://knighthacks.org/",
    );
    expect(normalizePublicGuildUrl(" https://github.com/knighthacks ")).toBe(
      "https://github.com/knighthacks",
    );
  });

  it("omits malformed and non-web links instead of failing the profile", () => {
    expect(normalizePublicGuildUrl("not a valid host")).toBeNull();
    expect(normalizePublicGuildUrl("javascript:alert(1)")).toBeNull();
    expect(normalizePublicGuildUrl(null)).toBeNull();
  });
});
