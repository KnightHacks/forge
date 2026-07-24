import { describe, expect, it, vi } from "vitest";

import { guildRouter } from "../../routers/guild";

vi.mock("@forge/db/client", () => ({
  db: {},
}));

vi.mock("../../utils/profile-picture/storage", () => ({
  profilePictureStorageClient: {},
}));

vi.mock("../../utils/resume/storage", () => ({
  resumeStorageClient: {},
}));

describe("Guild public router contract", () => {
  it("restores the approved discovery and profile procedures", () => {
    expect(Object.keys(guildRouter).sort()).toEqual([
      "getFilterOptions",
      "getProfile",
      "getPublicCompany",
      "getPublicGlobeLocations",
      "getResumeUrl",
      "getSitemapProfiles",
      "listProfiles",
      "listPublicCompanies",
    ]);
  });

  it("does not restore the out-of-scope Club roster procedure", () => {
    expect("getPublicClubTeamRoster" in guildRouter).toBe(false);
  });
});
