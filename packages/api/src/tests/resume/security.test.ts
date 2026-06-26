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
    ).toThrow("Resume must be a PDF.");
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
