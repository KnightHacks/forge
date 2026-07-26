import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  DiscordArchiveChannel,
  DiscordArchiveCheckpoint,
  DiscordArchiveMessage,
  DiscordArchiveState,
} from "../schemas/discord";

describe("Discord archive additive storage", () => {
  it("TC-002 stores bounded current message state without a raw payload", () => {
    const columns = Object.keys(getTableColumns(DiscordArchiveMessage));

    expect(columns).toEqual(
      expect.arrayContaining([
        "id",
        "guildId",
        "channelId",
        "authorDiscordUserId",
        "authorLabel",
        "authorIsBot",
        "webhookId",
        "applicationId",
        "messageType",
        "content",
        "createdAt",
        "editedAt",
        "deletedAt",
        "replyToMessageId",
        "pinned",
        "flags",
        "mentions",
        "embeds",
        "attachments",
        "components",
        "stickers",
        "poll",
        "ingestedAt",
        "lastObservedAt",
      ]),
    );
    expect(columns).not.toContain("raw");
    expect(columns).not.toContain("payload");
  });

  it("TC-012 and TC-013 store visible channel and thread topology", () => {
    expect(Object.keys(getTableColumns(DiscordArchiveChannel))).toEqual(
      expect.arrayContaining([
        "id",
        "guildId",
        "parentId",
        "type",
        "name",
        "topic",
        "isThread",
        "isPrivateThread",
        "archived",
        "locked",
        "discoveredAt",
        "discordUpdatedAt",
        "deletedAt",
      ]),
    );
  });

  it("TC-017 stores independent historical and newest cursors", () => {
    expect(Object.keys(getTableColumns(DiscordArchiveCheckpoint))).toEqual(
      expect.arrayContaining([
        "channelId",
        "guildId",
        "oldestMessageId",
        "newestMessageId",
        "backfillBeforeMessageId",
        "backfillStatus",
        "backfillCompletedAt",
        "lastBackfillAt",
        "lastDiscoveredAt",
        "lastReconciledAt",
        "processedMessageCount",
        "retryCount",
        "lastErrorCode",
        "lastErrorMessage",
        "updatedAt",
      ]),
    );
  });

  it("TC-024 stores guild health and a durable reconciliation lease", () => {
    expect(Object.keys(getTableColumns(DiscordArchiveState))).toEqual(
      expect.arrayContaining([
        "guildId",
        "status",
        "lastGatewayEventAt",
        "lastLiveWriteAt",
        "lastDiscoveryStartedAt",
        "lastDiscoveryCompletedAt",
        "lastReconciliationStartedAt",
        "lastReconciliationCompletedAt",
        "lastBackfillProgressAt",
        "leaseOwner",
        "leaseExpiresAt",
        "lastErrorCode",
        "lastErrorMessage",
        "failureCount",
        "updatedAt",
      ]),
    );
  });
});
