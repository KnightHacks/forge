import { describe, expect, it, vi } from "vitest";

import { alumniRouter } from "../../routers/alumni";

vi.mock("@forge/db/client", () => ({ db: {} }));
vi.mock("../../utils/alumni/bulletin-image", () => ({
  getAlumniBulletinImageUrl: vi.fn(),
  removeAlumniBulletinImage: vi.fn(),
  uploadAlumniBulletinImage: vi.fn(),
}));
vi.mock("../../utils/profile-picture/security", () => ({
  PROFILE_PICTURE_BUCKET_NAME: "profile-pictures",
  resolveProfilePictureObjectName: vi.fn(),
}));
vi.mock("../../utils/profile-picture/storage", () => ({
  profilePictureStorageClient: {
    presignedUrl: vi.fn(),
  },
}));

describe("alumni router contract", () => {
  it("exposes member graduation/dashboard and complete admin bulletin procedures", () => {
    expect(Object.keys(alumniRouter).sort()).toEqual(
      [
        "archiveBulletinPost",
        "createBulletinPost",
        "getDashboard",
        "listBulletinAdmin",
        "listLinkableForms",
        "removeBulletinImage",
        "reorderBulletinPosts",
        "resolveGraduation",
        "restoreBulletinPost",
        "updateBulletinPost",
        "uploadBulletinImage",
      ].sort(),
    );
  });
});
