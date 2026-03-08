import { Routes } from "discord-api-types/v10";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DISCORD } from "@forge/consts";

// Mock the REST client
const mockPost = vi.fn();

vi.mock("@discordjs/rest", () => ({
  REST: vi.fn().mockImplementation(() => ({
    post: mockPost,
    setToken: vi.fn().mockReturnThis(),
  })),
}));

describe("discord.log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send log message to Discord channel", async () => {
    const { log } = await import("@forge/utils/discord");

    await log({
      title: "Test Title",
      message: "Test Message",
      color: "tk_blue",
      userId: "123456789012345678",
    });

    expect(mockPost).toHaveBeenCalledWith(
      Routes.channelMessages(DISCORD.LOG_CHANNEL),
      {
        body: {
          embeds: [
            {
              title: "Test Title",
              description: "Test Message\n\nUser: <@123456789012345678>",
              color: 0x1a73e8, // tk_blue
              footer: {
                text: expect.any(String),
              },
            },
          ],
        },
      },
    );
  });

  it("should use correct color for blade_purple", async () => {
    const { log } = await import("@forge/utils/discord");

    await log({
      title: "Test",
      message: "Test",
      color: "blade_purple",
      userId: "123456789012345678",
    });

    expect(mockPost).toHaveBeenCalledWith(
      Routes.channelMessages(DISCORD.LOG_CHANNEL),
      expect.objectContaining({
        body: {
          embeds: [
            expect.objectContaining({
              color: 0xcca4f4, // blade_purple
            }),
          ],
        },
      }),
    );
  });

  it("should use correct color for uhoh_red", async () => {
    const { log } = await import("@forge/utils/discord");

    await log({
      title: "Test",
      message: "Test",
      color: "uhoh_red",
      userId: "123456789012345678",
    });

    expect(mockPost).toHaveBeenCalledWith(
      Routes.channelMessages(DISCORD.LOG_CHANNEL),
      expect.objectContaining({
        body: {
          embeds: [
            expect.objectContaining({
              color: 0xff0000, // uhoh_red
            }),
          ],
        },
      }),
    );
  });

  it("should use correct color for success_green", async () => {
    const { log } = await import("@forge/utils/discord");

    await log({
      title: "Test",
      message: "Test",
      color: "success_green",
      userId: "123456789012345678",
    });

    expect(mockPost).toHaveBeenCalledWith(
      Routes.channelMessages(DISCORD.LOG_CHANNEL),
      expect.objectContaining({
        body: {
          embeds: [
            expect.objectContaining({
              color: 0x00ff00, // success_green
            }),
          ],
        },
      }),
    );
  });

  it("should include timestamp in footer", async () => {
    const { log } = await import("@forge/utils/discord");

    await log({
      title: "Test",
      message: "Test",
      color: "tk_blue",
      userId: "123456789012345678",
    });

    const callArgs = mockPost.mock.calls[0];
    const embed = callArgs[1]?.body?.embeds?.[0];
    expect(embed?.footer?.text).toBeDefined();
    expect(typeof embed?.footer?.text).toBe("string");
  });
});
