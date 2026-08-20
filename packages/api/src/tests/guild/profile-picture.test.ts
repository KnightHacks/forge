import { describe, expect, it } from "vitest";

import { getPublicProfilePictureUrl } from "../../utils/guild/profile-picture";

const userId = "00000000-0000-4000-8000-000000000001";
const objectName = `${userId}/profile-picture-4ac506f0-ab78-4722-88f6-2808763b65aa.jpg`;
const publicUrl =
  `https://minio-y44gsgsskc4ko4kkwsg0csoc.135.237.97.107.sslip.io/` +
  `guild-profile-pictures/${objectName}`;

describe("Guild public profile pictures", () => {
  it.each([
    ["current object name", objectName],
    [
      "older absolute MinIO URL still stored for current roster members",
      `https://stored-minio.example.test/guild-profile-pictures/${objectName}`,
    ],
  ])("resolves a user-owned %s", (_label, profilePictureReference) => {
    expect(
      getPublicProfilePictureUrl({ profilePictureReference, userId }),
    ).toBe(publicUrl);
  });

  it("encodes object-name path segments", () => {
    expect(
      getPublicProfilePictureUrl({
        profilePictureReference: `${userId}/Carlos Catala #1.jpg`,
        userId,
      }),
    ).toBe(
      `https://minio-y44gsgsskc4ko4kkwsg0csoc.135.237.97.107.sslip.io/` +
        `guild-profile-pictures/${userId}/Carlos%20Catala%20%231.jpg`,
    );
  });

  it.each([
    ["missing", null],
    ["blank", "   "],
    ["malformed", "not-a-profile-picture"],
    [
      "malformed older absolute URL",
      "https://stored-minio.example.test/guild-profile-pictures/%E0%A4%A",
    ],
    [
      "owned by another user",
      "00000000-0000-4000-8000-000000000002/profile-picture-4ac506f0-ab78-4722-88f6-2808763b65aa.jpg",
    ],
  ])("returns null for a %s reference", (_label, reference) => {
    expect(
      getPublicProfilePictureUrl({
        profilePictureReference: reference,
        userId,
      }),
    ).toBeNull();
  });
});
