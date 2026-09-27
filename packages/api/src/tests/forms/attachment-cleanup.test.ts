import { describe, expect, it, vi } from "vitest";

import { selectAbandonedFormAttachments } from "../../utils/forms/attachment-cleanup";
import {
  classifyFormAttachmentAccess,
  isRespondentFormAsset,
  uploadSignatureMatches,
} from "../../utils/forms/attachments";

vi.mock("@forge/db/client", () => ({ db: {} }));

const cutoff = new Date("2026-07-15T18:00:00.000Z");

describe("form attachment cleanup", () => {
  it("[TC-024] removes only expired unreferenced uploads", () => {
    const stale = selectAbandonedFormAttachments({
      candidates: [
        {
          createdAt: new Date("2026-07-14T17:59:59.000Z"),
          finalizedAt: null,
          id: "abandoned",
          objectName: "forms/abandoned",
          responseId: null,
        },
        {
          createdAt: new Date("2026-07-14T17:59:59.000Z"),
          finalizedAt: new Date("2026-07-14T18:00:00.000Z"),
          id: "active-instruction",
          objectName: "forms/instruction",
          responseId: null,
        },
        {
          createdAt: new Date("2026-07-14T17:59:59.000Z"),
          finalizedAt: new Date("2026-07-14T18:00:00.000Z"),
          id: "active-response",
          objectName: "forms/response",
          responseId: "response-id",
        },
        {
          createdAt: cutoff,
          finalizedAt: null,
          id: "not-expired",
          objectName: "forms/new",
          responseId: null,
        },
      ],
      cutoff,
      retainedAttachmentIds: new Set(["active-instruction", "active-response"]),
    });

    expect(stale.map(({ id }) => id)).toEqual(["abandoned"]);
  });
});

describe("form attachment signatures", () => {
  it("[TC-024] rejects executable payloads disguised as approved uploads", () => {
    expect(
      uploadSignatureMatches(
        "application/pdf",
        Buffer.from([0x4d, 0x5a, 0x90, 0x00]),
      ),
    ).toBe(false);
    expect(
      uploadSignatureMatches("text/plain", Buffer.from("#!/bin/sh\nexit 0")),
    ).toBe(false);
    expect(
      uploadSignatureMatches("application/pdf", Buffer.from("not a pdf")),
    ).toBe(false);
  });

  it("[TC-024] accepts matching common document and image signatures", () => {
    expect(
      uploadSignatureMatches(
        "application/pdf",
        Buffer.from("%PDF-1.7\nexample"),
      ),
    ).toBe(true);
    expect(
      uploadSignatureMatches(
        "image/png",
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe(true);
  });
});

describe("form attachment audit boundary", () => {
  it("[TC-003, TC-010] audits only role-gated response attachment access", () => {
    const base = {
      isRespondentAsset: false,
      ownerUserId: "owner",
      requesterUserId: "admin",
    };

    expect(classifyFormAttachmentAccess({ ...base, purpose: "response" })).toBe(
      "admin_response",
    );
    expect(
      classifyFormAttachmentAccess({
        ...base,
        requesterUserId: "owner",
        purpose: "response",
      }),
    ).toBe("owner");
    expect(
      classifyFormAttachmentAccess({
        ...base,
        isRespondentAsset: true,
        purpose: "instruction",
      }),
    ).toBe("published_asset");
    expect(
      classifyFormAttachmentAccess({ ...base, purpose: "instruction" }),
    ).toBe("admin_asset");
    expect(classifyFormAttachmentAccess({ ...base, purpose: "banner" })).toBe(
      "admin_asset",
    );
    expect(
      classifyFormAttachmentAccess({
        ...base,
        requesterUserId: "owner",
        purpose: "banner",
      }),
    ).toBe("admin_asset");
  });
});

describe("form respondent assets", () => {
  it("keeps the current banner readable for published and archived form shells", () => {
    const base = {
      isReferenced: true,
      purpose: "banner" as const,
    };
    expect(isRespondentFormAsset({ ...base, formState: "published" })).toBe(
      true,
    );
    expect(isRespondentFormAsset({ ...base, formState: "archived" })).toBe(
      true,
    );
    expect(isRespondentFormAsset({ ...base, formState: "draft" })).toBe(false);
  });

  it("keeps instruction files limited to published forms", () => {
    expect(
      isRespondentFormAsset({
        formState: "archived",
        isReferenced: true,
        purpose: "instruction",
      }),
    ).toBe(false);
    expect(
      isRespondentFormAsset({
        formState: "published",
        isReferenced: false,
        purpose: "banner",
      }),
    ).toBe(false);
  });
});
