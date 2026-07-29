import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { DiscordArchiveHealthDashboard } from "~/app/_components/admin/discord-archive/discord-archive-health";
import { canAccessDiscordArchive } from "~/lib/admin-access";

const health = {
  checkpoints: {
    completeCount: 2,
    coverage: 1,
    failedCount: 0,
    lastReconciledAt: new Date("2026-07-26T20:00:00.000Z"),
    pendingCount: 0,
    processedMessageCount: 120,
    runningCount: 0,
    totalCount: 2,
  },
  generatedAt: new Date("2026-07-26T20:01:00.000Z"),
  ingestion: {
    failureCount: 0,
    gatewayLagSeconds: 10,
    lastBackfillProgressAt: new Date("2026-07-26T19:58:00.000Z"),
    lastDiscoveryCompletedAt: new Date("2026-07-26T19:59:00.000Z"),
    lastErrorCode: null,
    lastGatewayEventAt: new Date("2026-07-26T20:00:50.000Z"),
    lastLiveWriteAt: new Date("2026-07-26T20:00:50.000Z"),
    lastReconciliationCompletedAt: new Date("2026-07-26T20:00:00.000Z"),
    leaseActive: false,
    leaseExpiresAt: null,
    reconciliationLagSeconds: 60,
    status: "healthy",
    updatedAt: new Date("2026-07-26T20:00:50.000Z"),
  },
  messages: {
    currentMessageCount: 118,
    firstMessageAt: new Date("2023-09-14T00:00:00.000Z"),
    lastObservedAt: new Date("2026-07-26T20:00:50.000Z"),
    tombstonedMessageCount: 2,
    totalMessageCount: 120,
  },
  nextCursor: null,
  rows: [
    {
      archived: false,
      backfillCompletedAt: new Date("2026-07-26T19:58:00.000Z"),
      backfillStatus: "complete",
      channelId: "1151877367434850364",
      isPrivateThread: false,
      isThread: false,
      lastBackfillAt: new Date("2026-07-26T19:58:00.000Z"),
      lastErrorCode: null,
      lastReconciledAt: new Date("2026-07-26T20:00:00.000Z"),
      name: "archive-test",
      processedMessageCount: 120,
      retryCount: 0,
      type: 0,
    },
  ],
  surfaces: {
    channelCount: 1,
    privateThreadCount: 0,
    surfaceCount: 2,
    threadCount: 1,
  },
} as RouterOutputs["discordArchive"]["getHealth"];

describe("DiscordArchiveHealthDashboard", () => {
  it("requires the literal effective officer permission", () => {
    const permissions = (values: Record<string, boolean>) =>
      values as Parameters<typeof canAccessDiscordArchive>[0];

    expect(canAccessDiscordArchive(permissions({ IS_OFFICER: true }))).toBe(
      true,
    );
    expect(
      canAccessDiscordArchive(
        permissions({
          CONFIGURE_ROLES: true,
          READ_CLUB_DATA: true,
          READ_MEMBERS: true,
        }),
      ),
    ).toBe(false);
  });

  it("renders operational aggregates without message access or mutations", () => {
    const html = renderToStaticMarkup(
      <DiscordArchiveHealthDashboard health={health} />,
    );

    expect(html).toContain("Discord archive health");
    expect(html).toContain("Archive services are reporting healthy");
    expect(html).toContain("archive-test");
    expect(html).toContain("Backfill coverage");
    expect(html).toContain("Message text is intentionally unavailable");
    expect(html).not.toContain("raw-message-sentinel");
    expect(html).not.toContain("Delete message");
    expect(html).not.toContain("Message content");
  });
});
