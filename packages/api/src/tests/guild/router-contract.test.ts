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
      "getPublicClubTeamRoster",
      "getPublicCompany",
      "getPublicGlobeLocations",
      "getResumeUrl",
      "getSitemapProfiles",
      "listProfiles",
      "listPublicCompanies",
    ]);
  });

  // Guild Collective deferred this procedure on 2026-07-23 and this test used to
  // assert its absence. The deferral was reasoned from the Guild side and missed
  // that apps/club calls it directly, so the Club team page rendered an empty
  // roster. The deferral was reversed on 2026-07-27; this now guards the
  // cross-app contract apps/club depends on.
  it("exposes the Club roster procedure that apps/club consumes", () => {
    expect("getPublicClubTeamRoster" in guildRouter).toBe(true);
  });
});
