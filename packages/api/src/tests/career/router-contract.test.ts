import { describe, expect, it, vi } from "vitest";

import { careerRouter } from "../../routers/career";

vi.mock("@forge/db/client", () => ({ db: {} }));
vi.mock("../../utils/career/company-image", () => ({
  getCompanyImageUrl: vi.fn(),
  removeCompanyImage: vi.fn(),
  uploadCompanyImage: vi.fn(),
}));

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
        "removeCompanyImage",
        "rejectCompany",
        "replaceMyEmploymentHistory",
        "searchCompanies",
        "searchUsCities",
        "updateCompany",
        "updateMyCurrentCity",
        "uploadCompanyImage",
      ].sort(),
    );
  });
});
