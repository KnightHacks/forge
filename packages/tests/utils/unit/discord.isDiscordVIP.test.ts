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

describe("discord.isDiscordVIP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when user has VIP role", async () => {
    const { isDiscordVIP } = await import("@forge/utils/discord");

    mockGet.mockResolvedValue({
      roles: [DISCORD.VIP_ROLE, "other-role"],
    });

    const discordUserId = "123456789012345678";

    const result = await isDiscordVIP(discordUserId);

    expect(result).toBe(true);
    expect(mockGet).toHaveBeenCalledWith(
      Routes.guildMember(DISCORD.KNIGHTHACKS_GUILD, discordUserId),
    );
  });

  it("should return false when user does not have VIP role", async () => {
    const { isDiscordVIP } = await import("@forge/utils/discord");

    mockGet.mockResolvedValue({
      roles: ["other-role", "another-role"],
    });

    const discordUserId = "123456789012345678";

    const result = await isDiscordVIP(discordUserId);

    expect(result).toBe(false);
  });
});
