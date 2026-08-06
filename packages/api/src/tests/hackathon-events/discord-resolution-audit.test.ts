import { describe, expect, it } from "vitest";

import { hackathonDiscordResolutionAuditResult } from "../../routers/hackathon-event";

describe("hackathon Discord resolution audit semantics", () => {
  it("records an acknowledged missing projection as a successful repair", () => {
    expect(
      hackathonDiscordResolutionAuditResult({
        discordSyncState: "unknown",
        mode: "confirm-no-projection",
        resultStatus: "resolved",
      }),
    ).toEqual({
      providerOutcome: "succeeded",
      result: "acknowledged_absent",
    });
  });

  it("keeps a failed external create repair visible as a provider failure", () => {
    expect(
      hackathonDiscordResolutionAuditResult({
        discordSyncState: "error",
        mode: "confirm-create-new",
        resultStatus: "syncing",
      }),
    ).toEqual({
      providerOutcome: "failed_external",
      result: "syncing",
    });
  });
});
