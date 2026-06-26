import { describe, expect, it } from "vitest";

import {
  decodeAndValidateProfilePictureDataUrl,
  resolveProfilePictureObjectName,
} from "../../utils/profile-picture/security";

const userId = "00000000-0000-4000-8000-000000000001";
const objectName = `${userId}/1781470012420-Dylan_Vidal.jpg`;

function imageDataUrl(contentType: string, bytes: number[]) {
  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}

describe("profile-picture security", () => {
  it("accepts a valid JPEG data URL", () => {
    const result = decodeAndValidateProfilePictureDataUrl(
      imageDataUrl("image/jpeg", [0xff, 0xd8, 0xff, 0x00]),
    );

    expect(result.contentType).toBe("image/jpeg");
    expect(result.fileBuffer.subarray(0, 3)).toEqual(
      Buffer.from([0xff, 0xd8, 0xff]),
    );
  });

  it("rejects unsupported image content types", () => {
    expect(() =>
      decodeAndValidateProfilePictureDataUrl(
        imageDataUrl("image/svg+xml", [0x3c, 0x73, 0x76, 0x67]),
      ),
    ).toThrow("Profile picture must be a JPEG, PNG, GIF, or WebP image.");
  });

  it("resolves legacy MinIO URLs to current-user-owned object names", () => {
    expect(
      resolveProfilePictureObjectName(
        `https://minio.example.test/guild-profile-pictures/${objectName}`,
        userId,
      ),
    ).toBe(objectName);
  });

  it("rejects legacy MinIO URLs for another user's object", () => {
    expect(
      resolveProfilePictureObjectName(
        "https://minio.example.test/guild-profile-pictures/00000000-0000-4000-8000-000000000002/avatar.jpg",
        userId,
      ),
    ).toBeNull();
  });
});
