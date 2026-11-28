import { describe, expect, it, vi } from "vitest";

import { jobBoardRouter } from "../../routers/job-board";

vi.mock("@forge/db/client", () => ({ db: {} }));
vi.mock("../../utils/profile-picture/storage", () => ({
  profilePictureStorageClient: {},
}));

describe("job board router contract", () => {
  it("exposes job, community and own-application procedures", () => {
    expect(Object.keys(jobBoardRouter).sort()).toEqual(
      [
        "getCompany",
        "getJob",
        "listMyApplications",
        "listPeopleInProcess",
        "removeApplication",
        "saveApplication",
        "searchJobs",
        "updateApplication",
      ].sort(),
    );
  });
});
