import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { AlumniBulletinPost, Member } from "../schemas/knight-hacks";

describe("alumni dashboard additive storage", () => {
  it("TC-003 stores the member's explicit alumni confirmation", () => {
    expect(Object.keys(getTableColumns(Member))).toContain("alumniConfirmedAt");
  });

  it("TC-010 stores the complete bulletin lifecycle and content model", () => {
    expect(Object.keys(getTableColumns(AlumniBulletinPost))).toEqual(
      expect.arrayContaining([
        "archivedAt",
        "body",
        "createdAt",
        "createdByUserId",
        "ctaLabel",
        "displayOrder",
        "expiresAt",
        "externalUrl",
        "formId",
        "id",
        "imageAlt",
        "imageObjectName",
        "publishAt",
        "state",
        "title",
        "updatedAt",
        "updatedByUserId",
      ]),
    );
  });
});
