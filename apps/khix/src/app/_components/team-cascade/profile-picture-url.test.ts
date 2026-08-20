import { describe, expect, it } from "vitest";

import { getKhixProfilePictureUrl } from "./profile-picture-url";

const objectName =
  "2c48b2aa-cccd-4fb7-9a06-a5a369d32545/profile-picture-4ac506f0-ab78-4722-88f6-2808763b65aa.jpg";
const publicUrl =
  `https://minio-y44gsgsskc4ko4kkwsg0csoc.135.237.97.107.sslip.io/` +
  `guild-profile-pictures/${objectName}`;

describe("KHIX profile-picture URLs", () => {
  it("turns a current Guild object key into a public URL", () => {
    expect(getKhixProfilePictureUrl(objectName)).toBe(publicUrl);
  });

  it("moves an older absolute bucket URL onto the current public host", () => {
    expect(
      getKhixProfilePictureUrl(
        `https://older-minio.example.test/guild-profile-pictures/${objectName}`,
      ),
    ).toBe(publicUrl);
  });

  it.each([
    ["missing", null],
    ["blank", "   "],
    ["not an object key", "avatar.jpg"],
    ["not HTTPS", `http://example.test/guild-profile-pictures/${objectName}`],
  ])("rejects a reference that is %s", (_label, reference) => {
    expect(getKhixProfilePictureUrl(reference)).toBeNull();
  });
});
