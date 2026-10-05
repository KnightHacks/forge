import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedPortalContext } from "../../hacker-portal/reads";
import { getPortalSession } from "../../hacker-portal/reads";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  photo: vi.fn(),
  user: vi.fn(),
}));

vi.mock("@forge/db/client", () => ({
  db: { select: mocks.select },
}));
vi.mock("../../utils/profile-picture/storage", () => ({
  getProfilePictureDownloadUrlForUser: mocks.photo,
}));

const context: AuthenticatedPortalContext = {
  client: {
    id: "client-record",
    clientId: "khix",
    hackathonId: "hackathon-1",
    origin: "https://2026.knighthacks.org",
    enabled: true,
  },
  session: {
    id: "portal-session",
    clientRecordId: "client-record",
    hackathonId: "hackathon-1",
    userId: "00000000-0000-4000-8000-000000000001",
    betterAuthSessionId: "blade-session",
  },
  headers: new Headers(),
  requestId: "session-photo-test",
};

describe("hacker session profile photo", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.select.mockReturnValue({
      from: () => ({ where: () => ({ limit: mocks.user }) }),
    });
    mocks.user.mockResolvedValue([
      { name: "Hacker", image: "discord-avatar", discordUserId: "12345" },
    ]);
    mocks.photo.mockResolvedValue({ url: null });
  });

  it("prefers the authenticated user's saved Blade photo over Discord", async () => {
    const url = "https://storage.example.test/profile.png?signed=example";
    mocks.photo.mockResolvedValue({ url });

    await expect(getPortalSession(context)).resolves.toMatchObject({
      authenticated: true,
      avatarUrl: url,
      displayName: "Hacker",
    });
    expect(mocks.photo).toHaveBeenCalledExactlyOnceWith(context.session.userId);
  });

  it.each([
    [
      "discord-avatar",
      "https://cdn.discordapp.com/avatars/12345/discord-avatar.png",
    ],
    ["a_animated", "https://cdn.discordapp.com/avatars/12345/a_animated.gif"],
    [
      "https://cdn.discordapp.com/photo.png",
      "https://cdn.discordapp.com/photo.png",
    ],
  ])(
    "falls back to the Discord photo %s when no Blade photo is saved",
    async (image, expected) => {
      mocks.user.mockResolvedValue([
        { name: "Hacker", image, discordUserId: "12345" },
      ]);
      await expect(getPortalSession(context)).resolves.toMatchObject({
        avatarUrl: expected,
      });
    },
  );

  it("keeps the session available if the saved photo cannot be signed", async () => {
    mocks.photo.mockRejectedValue(new Error("Storage unavailable"));
    await expect(getPortalSession(context)).resolves.toMatchObject({
      authenticated: true,
      avatarUrl: "https://cdn.discordapp.com/avatars/12345/discord-avatar.png",
    });
  });

  it("returns no photo when neither source exists", async () => {
    mocks.user.mockResolvedValue([
      { name: "Hacker", image: null, discordUserId: "12345" },
    ]);
    await expect(getPortalSession(context)).resolves.toMatchObject({
      avatarUrl: null,
    });
  });

  it("does not look up photos for a signed-out visitor", async () => {
    await expect(
      getPortalSession({ ...context, session: null }),
    ).resolves.toEqual({
      authenticated: false,
      displayName: null,
      expiresAt: null,
    });
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.photo).not.toHaveBeenCalled();
  });
});
