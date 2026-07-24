import { describe, expect, it, vi } from "vitest";

import { careerRouter } from "../../routers/career";

vi.mock("@forge/db/client", () => ({ db: {} }));

describe("Guild Career Network router contract", () => {
  it("exposes member career history, catalog, and location procedures", () => {
    expect(Object.keys(careerRouter).sort()).toEqual(
      [
        "approveCompany",
        "createCompany",
        "getAdminCompany",
        "listAdminCompanies",
        "listMyEmployment",
        "mergeCompanies",
        "rejectCompany",
        "replaceMyEmploymentHistory",
        "searchCompanies",
        "searchUsCities",
        "updateCompany",
        "updateMyCurrentCity",
      ].sort(),
    );
  });
});
