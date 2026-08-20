import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPublicProfilePictureUrl } from "../../utils/guild/profile-picture";

const mocks = vi.hoisted(() => ({
  presignedUrl: vi.fn(),
}));

vi.mock("../../utils/profile-picture/storage", () => ({
  profilePictureStorageClient: {
    presignedUrl: mocks.presignedUrl,
  },
}));

const userId = "00000000-0000-4000-8000-000000000001";
const objectName = `${userId}/profile-picture-4ac506f0-ab78-4722-88f6-2808763b65aa.jpg`;
const signedUrl = "https://storage.example.test/signed-profile-picture";

describe("Guild public profile pictures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.presignedUrl.mockResolvedValue(signedUrl);
  });

  it.each([
    ["current object name", objectName],
    [
      "legacy MinIO URL",
      `https://legacy-minio.example.test/guild-profile-pictures/${objectName}`,
    ],
  ])("signs a user-owned %s", async (_label, profilePictureReference) => {
    await expect(
      getPublicProfilePictureUrl({ profilePictureReference, userId }),
    ).resolves.toBe(signedUrl);

    expect(mocks.presignedUrl).toHaveBeenCalledWith(
      "GET",
      "guild-profile-pictures",
      objectName,
      60 * 60,
    );
  });

  it.each([
    ["missing", null],
    ["blank", "   "],
    ["malformed", "not-a-profile-picture"],
    [
      "malformed legacy URL",
      "https://legacy-minio.example.test/guild-profile-pictures/%E0%A4%A",
    ],
    [
      "owned by another user",
      "00000000-0000-4000-8000-000000000002/profile-picture-4ac506f0-ab78-4722-88f6-2808763b65aa.jpg",
    ],
  ])("returns null for a %s reference", async (_label, reference) => {
    await expect(
      getPublicProfilePictureUrl({
        profilePictureReference: reference,
        userId,
      }),
    ).resolves.toBeNull();

    expect(mocks.presignedUrl).not.toHaveBeenCalled();
  });

  it("returns null without leaking a storage failure", async () => {
    mocks.presignedUrl.mockRejectedValue(new Error("private storage detail"));

    await expect(
      getPublicProfilePictureUrl({
        profilePictureReference: objectName,
        userId,
      }),
    ).resolves.toBeNull();
  });
});
