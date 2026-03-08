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

describe("discord.isDiscordMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when user is a member", async () => {
    const { isDiscordMember } = await import("@forge/utils/discord");

    mockGet.mockResolvedValue({
      user: { id: "123456789012345678" },
      roles: [],
    });

    const user = {
      discordUserId: "123456789012345678",
    };

    const result = await isDiscordMember(user);

    expect(result).toBe(true);
    expect(mockGet).toHaveBeenCalledWith(
      Routes.guildMember(DISCORD.KNIGHTHACKS_GUILD, user.discordUserId),
    );
  });

  it("should return false when user is not a member", async () => {
    const { isDiscordMember } = await import("@forge/utils/discord");

    mockGet.mockRejectedValue(new Error("Member not found"));

    const user = {
      discordUserId: "123456789012345678",
    };

    const result = await isDiscordMember(user);

    expect(result).toBe(false);
  });
});
