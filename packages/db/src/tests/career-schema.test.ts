import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { Company, Employment, Member } from "../schemas/knight-hacks";

describe("Guild Career Network additive storage", () => {
  it("TC-014 keeps the legacy company field and adds explicit current location", () => {
    expect(Object.keys(getTableColumns(Member))).toEqual(
      expect.arrayContaining([
        "company",
        "currentCityKey",
        "guildLocationVisible",
      ]),
    );
  });

  it("stores canonical company identity, aliases, lifecycle, and creator", () => {
    expect(Object.keys(getTableColumns(Company))).toEqual(
      expect.arrayContaining([
        "aliases",
        "createdAt",
        "createdByUserId",
        "displayName",
        "domain",
        "id",
        "legalName",
        "mergedIntoCompanyId",
        "normalizedDisplayName",
        "reviewState",
        "updatedAt",
      ]),
    );
  });

  it("stores complete member employment without an extra location table", () => {
    expect(Object.keys(getTableColumns(Employment))).toEqual(
      expect.arrayContaining([
        "cityKey",
        "companyId",
        "createdAt",
        "endMonth",
        "experienceType",
        "guildVisible",
        "id",
        "memberId",
        "startMonth",
        "state",
        "title",
        "updatedAt",
      ]),
    );
  });
});
