import { describe, expect, it } from "vitest";

import {
  buildDiscordAnalyticsMix,
  buildDiscordChannelDistribution,
} from "../../utils/discord-archive/analytics-model";

describe("Discord archive analytics read model", () => {
  it("builds deterministic, mutually exclusive sender shares", () => {
    const mix = buildDiscordAnalyticsMix(
      [
        { count: 72, kind: "human" },
        { count: 18, kind: "bot" },
        { count: 10, kind: "webhook" },
      ],
      100,
    );

    expect(mix).toEqual([
      { count: 72, kind: "human", label: "People", share: 0.72 },
      { count: 18, kind: "bot", label: "Bots", share: 0.18 },
      { count: 10, kind: "webhook", label: "Webhooks", share: 0.1 },
      { count: 0, kind: "system", label: "System", share: 0 },
    ]);
    expect(mix.reduce((sum, row) => sum + row.count, 0)).toBe(100);
  });

  it("returns only aggregate channel labels, counts, types, and shares", () => {
    const channels = buildDiscordChannelDistribution(
      [
        {
          count: 30,
          isThread: false,
          name: "general",
          type: 0,
        },
        {
          count: 20,
          isThread: true,
          name: "project-help",
          type: 11,
        },
      ],
      100,
    );
    const serialized = JSON.stringify(channels);

    expect(channels).toEqual([
      {
        count: 30,
        isThread: false,
        label: "general",
        share: 0.3,
        type: 0,
      },
      {
        count: 20,
        isThread: true,
        label: "project-help",
        share: 0.2,
        type: 11,
      },
    ]);
    for (const forbidden of [
      "content",
      "messageId",
      "authorDiscordUserId",
      "authorLabel",
      "attachments",
      "embeds",
    ]) {
      expect(serialized).not.toContain(`"${forbidden}"`);
    }
  });
});
