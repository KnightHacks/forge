import { describe, expect, it, vi } from "vitest";

import { selectAbandonedFormAttachments } from "../../utils/forms/attachment-cleanup";
import { uploadSignatureMatches } from "../../utils/forms/attachments";

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
