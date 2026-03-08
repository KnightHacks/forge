import { Routes } from "discord-api-types/v10";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import { DISCORD } from "@forge/consts";

// Mock the REST client
const mockGet = vi.fn();

vi.mock("@discordjs/rest", () => ({
  REST: vi.fn().mockImplementation(() => ({
    get: mockGet,
    setToken: vi.fn().mockReturnThis(),
  })),
}));

describe("discord.isDiscordAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when user has admin role", async () => {
    const { isDiscordAdmin } = await import("@forge/utils/discord");

    mockGet.mockResolvedValue({
      roles: [DISCORD.ADMIN_ROLE, "other-role"],
    });

    const user: Session["user"] = {
      id: "test-user-id",
      discordUserId: "123456789012345678",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await isDiscordAdmin(user);

    expect(result).toBe(true);
    expect(mockGet).toHaveBeenCalledWith(
      Routes.guildMember(DISCORD.KNIGHTHACKS_GUILD, user.discordUserId),
    );
  });

  it("should return false when user does not have admin role", async () => {
    const { isDiscordAdmin } = await import("@forge/utils/discord");

    mockGet.mockResolvedValue({
      roles: ["other-role", "another-role"],
    });

    const user: Session["user"] = {
      id: "test-user-id",
      discordUserId: "123456789012345678",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await isDiscordAdmin(user);

    expect(result).toBe(false);
  });

  it("should return false when API call fails", async () => {
    const { isDiscordAdmin } = await import("@forge/utils/discord");

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {
        // Mock implementation
      });
    mockGet.mockRejectedValue(new Error("API error"));

    const user: Session["user"] = {
      id: "test-user-id",
      discordUserId: "123456789012345678",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await isDiscordAdmin(user);

    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
