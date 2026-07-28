import { describe, expect, it } from "vitest";

import {
  decodeAndValidateResumeDataUrl,
  isResumeObjectOwnedByUser,
} from "../../utils/resume/security";

const userId = "00000000-0000-4000-8000-000000000001";

function dataUrlFromBuffer(buffer: Buffer) {
  return `data:application/pdf;base64,${buffer.toString("base64")}`;
}

describe("resume security", () => {
  it("accepts a valid PDF data URL", () => {
    const result = decodeAndValidateResumeDataUrl(
      dataUrlFromBuffer(Buffer.from("%PDF-1.7\n")),
    );

    expect(result.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("rejects non-PDF data even when the data URL content type says PDF", () => {
    expect(() =>
      decodeAndValidateResumeDataUrl(
        dataUrlFromBuffer(Buffer.from("not actually a pdf")),
      ),
    ).toThrow("Resume must be a valid PDF.");
  });

  it("accepts a PDF whose type the browser could not identify", () => {
    const dataUrl = `data:application/octet-stream;base64,${Buffer.from("%PDF-1.7\n").toString("base64")}`;

    expect(
      decodeAndValidateResumeDataUrl(dataUrl, "Resume.PDF")
        .subarray(0, 5)
        .toString("ascii"),
    ).toBe("%PDF-");
    // Without a filename there is nothing to fall back to.
    expect(() => decodeAndValidateResumeDataUrl(dataUrl)).toThrow(
      "Resume must be a PDF.",
    );
    // And the extension never overrides a type that is simply wrong.
    expect(() =>
      decodeAndValidateResumeDataUrl(
        `data:image/png;base64,${Buffer.from("%PDF-1.7\n").toString("base64")}`,
        "Resume.pdf",
      ),
    ).toThrow("Resume must be a PDF.");
  });

  it("rejects an oversized or malformed resume payload", () => {
    expect(() =>
      decodeAndValidateResumeDataUrl(
        dataUrlFromBuffer(
          Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(5 * 1000000)]),
        ),
      ),
    ).toThrow("Resume must be 5MB or smaller.");
    expect(() =>
      decodeAndValidateResumeDataUrl("data:application/pdf;base64,!!!!"),
    ).toThrow("Resume data is missing or invalid.");
  });

  it("accepts only current-user-owned resume object names", () => {
    expect(isResumeObjectOwnedByUser(`${userId}/Resume.pdf`, userId)).toBe(
      true,
    );
    expect(
      isResumeObjectOwnedByUser(
        "00000000-0000-4000-8000-000000000002/Resume.pdf",
        userId,
      ),
    ).toBe(false);
    expect(isResumeObjectOwnedByUser(`${userId}/../Resume.pdf`, userId)).toBe(
      false,
    );
  });
});
