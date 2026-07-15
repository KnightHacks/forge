import { describe, expect, it } from "vitest";

import { shouldSuppressDiscordAuditLogs } from "../discord-log-policy";

describe("Discord audit log policy", () => {
  it("suppresses audit-channel delivery while Blade E2E auth is enabled", () => {
    expect(shouldSuppressDiscordAuditLogs({ BLADE_E2E_AUTH: "true" })).toBe(
      true,
    );
  });

  it("keeps audit-channel delivery enabled outside E2E runs", () => {
    expect(shouldSuppressDiscordAuditLogs({ BLADE_E2E_AUTH: "false" })).toBe(
      false,
    );
    expect(shouldSuppressDiscordAuditLogs({})).toBe(false);
  });
});
