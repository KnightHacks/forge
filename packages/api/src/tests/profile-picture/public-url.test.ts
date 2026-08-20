import { describe, expect, it } from "vitest";

import { getPublicProfilePictureUrl } from "../../utils/profile-picture/public-url";

const userId = "00000000-0000-4000-8000-000000000001";
const objectName = `${userId}/profile-picture-4ac506f0-ab78-4722-88f6-2808763b65aa.jpg`;
const publicUrl =
  `https://minio-y44gsgsskc4ko4kkwsg0csoc.135.237.97.107.sslip.io/` +
  `guild-profile-pictures/${objectName}`;

describe("public profile-picture URLs", () => {
  it("returns the canonical public URL for a user-owned object key", () => {
    expect(
      getPublicProfilePictureUrl({
        profilePictureReference: objectName,
        userId,
      }),
    ).toBe(publicUrl);
  });

  it.each([
    ["missing", null],
    ["blank", "   "],
    ["malformed", "not-a-profile-picture"],
    [
      "owned by another user",
      "00000000-0000-4000-8000-000000000002/profile-picture-4ac506f0-ab78-4722-88f6-2808763b65aa.jpg",
    ],
  ])("returns null for a reference that is %s", (_label, reference) => {
    expect(
      getPublicProfilePictureUrl({
        profilePictureReference: reference,
        userId,
      }),
    ).toBeNull();
  });
});
