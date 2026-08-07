import { describe, expect, it } from "vitest";

import { normalizeDiscordAuthorizationURL } from "../discord-authorization-url";

describe("normalizeDiscordAuthorizationURL", () => {
  it("moves Better Auth Discord redirects to the canonical endpoint", () => {
    const legacyURL =
      "https://discord.com/api/oauth2/authorize?scope=identify+email&state=test";

    expect(normalizeDiscordAuthorizationURL(legacyURL)).toBe(
      "https://discord.com/oauth2/authorize?scope=identify+email&state=test",
    );
  });

  it("does not rewrite unrelated redirect URLs", () => {
    const unrelatedURL = "https://example.com/api/oauth2/authorize?state=test";

    expect(normalizeDiscordAuthorizationURL(unrelatedURL)).toBe(unrelatedURL);
  });
});
