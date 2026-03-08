import { Routes } from "discord-api-types/v10";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DISCORD } from "@forge/consts";

// Mock the REST client
const mockDelete = vi.fn();

vi.mock("@discordjs/rest", () => ({
  REST: vi.fn().mockImplementation(() => ({
    delete: mockDelete,
    setToken: vi.fn().mockReturnThis(),
  })),
}));

describe("discord.removeRoleFromMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call Discord API to remove role from member", async () => {
    const { removeRoleFromMember } = await import("@forge/utils/discord");

    const discordUserId = "123456789012345678";
    const roleId = "987654321098765432";

    await removeRoleFromMember(discordUserId, roleId);

    expect(mockDelete).toHaveBeenCalledWith(
      Routes.guildMemberRole(DISCORD.KNIGHTHACKS_GUILD, discordUserId, roleId),
    );
  });
});
