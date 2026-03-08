import { Routes } from "discord-api-types/v10";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DISCORD } from "@forge/consts";

// Mock the REST client
const mockGet = vi.fn();

vi.mock("@discordjs/rest", () => ({
  REST: vi.fn().mockImplementation(() => ({
    get: mockGet,
    setToken: vi.fn().mockReturnThis(),
  })),
}));

describe("discord.resolveDiscordUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return Discord user ID when user is found", async () => {
    const { resolveDiscordUserId } = await import("@forge/utils/discord");

    const mockUserId = "123456789012345678";
    mockGet.mockResolvedValue([
      {
        user: { id: mockUserId, username: "testuser" },
      },
    ]);

    const result = await resolveDiscordUserId("testuser");

    expect(result).toBe(mockUserId);
    expect(mockGet).toHaveBeenCalledWith(
      `${Routes.guildMembersSearch(DISCORD.KNIGHTHACKS_GUILD)}?query=${encodeURIComponent("testuser")}&limit=1`,
    );
  });

  it("should return null when user is not found", async () => {
    const { resolveDiscordUserId } = await import("@forge/utils/discord");

    mockGet.mockResolvedValue([]);

    const result = await resolveDiscordUserId("nonexistentuser");

    expect(result).toBeNull();
  });

  it("should trim and lowercase username", async () => {
    const { resolveDiscordUserId } = await import("@forge/utils/discord");

    const mockUserId = "123456789012345678";
    mockGet.mockResolvedValue([
      {
        user: { id: mockUserId, username: "TestUser" },
      },
    ]);

    const result = await resolveDiscordUserId("  TestUser  ");

    expect(result).toBe(mockUserId);
    expect(mockGet).toHaveBeenCalledWith(
      `${Routes.guildMembersSearch(DISCORD.KNIGHTHACKS_GUILD)}?query=${encodeURIComponent("testuser")}&limit=1`,
    );
  });
});
