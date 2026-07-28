import { describe, expect, it } from "vitest";

import {
  BULLETIN_IMAGE_UPLOAD_POLICY,
  checkUploadContent,
  checkUploadMetadata,
  COMPANY_IMAGE_UPLOAD_POLICY,
  hasExecutableSignature,
  IMAGE_UPLOAD_POLICY,
  matchesUploadSignature,
  maxDataUrlLength,
  mimeTypeAllowed,
  parseBase64DataUrl,
  PROFILE_PICTURE_UPLOAD_POLICY,
  RESUME_UPLOAD_POLICY,
  uploadAccept,
  uploadExtension,
  validateFormUpload,
} from "../index";

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
const GIF_BYTES = new Uint8Array([...Buffer.from("GIF89a"), 0x00]);
const WEBP_BYTES = new Uint8Array([
  ...Buffer.from("RIFF"),
  0,
  0,
  0,
  0,
  ...Buffer.from("WEBP"),
]);
const PDF_BYTES = new Uint8Array(Buffer.from("%PDF-1.7\n..."));

describe("upload policies", () => {
  it("keeps resumes and images separate rather than merging every allowlist", () => {
    expect(RESUME_UPLOAD_POLICY.types.map(({ mimeType }) => mimeType)).toEqual([
      "application/pdf",
    ]);
    expect(IMAGE_UPLOAD_POLICY.types.map(({ mimeType }) => mimeType)).toEqual([
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ]);

    expect(
      checkUploadMetadata(RESUME_UPLOAD_POLICY, {
        contentType: "image/png",
        fileName: "headshot.png",
        size: 10,
      }),
    ).toMatchObject({ ok: false, reason: "wrong_type" });
    expect(
      checkUploadMetadata(PROFILE_PICTURE_UPLOAD_POLICY, {
        contentType: "application/pdf",
        fileName: "resume.pdf",
        size: 10,
      }),
    ).toMatchObject({ ok: false, reason: "wrong_type" });
  });

  it("gives every image upload the same allowlist, differing only in wording", () => {
    for (const policy of [
      PROFILE_PICTURE_UPLOAD_POLICY,
      COMPANY_IMAGE_UPLOAD_POLICY,
      BULLETIN_IMAGE_UPLOAD_POLICY,
    ]) {
      expect(policy.types).toBe(IMAGE_UPLOAD_POLICY.types);
      expect(policy.maxBytes).toBe(2 * 1024 * 1024);
    }

    // The bulletin path used to reject GIF in a second pass with its own
    // wording after the shared decoder had already accepted it.
    expect(
      checkUploadContent(BULLETIN_IMAGE_UPLOAD_POLICY, {
        bytes: GIF_BYTES,
        contentType: "image/gif",
        fileName: "party.gif",
      }),
    ).toMatchObject({ ok: true });

    expect(
      checkUploadMetadata(BULLETIN_IMAGE_UPLOAD_POLICY, {
        contentType: "image/svg+xml",
        fileName: "logo.svg",
        size: 10,
      }),
    ).toMatchObject({
      message: "Bulletin image must be a JPEG, PNG, GIF, or WebP image.",
      ok: false,
    });
  });

  it("derives the accept attribute from the policy so the two cannot drift", () => {
    expect(uploadAccept(RESUME_UPLOAD_POLICY)).toBe("application/pdf,.pdf");
    expect(uploadAccept(IMAGE_UPLOAD_POLICY)).toBe(
      "image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp",
    );
  });

  it("falls back to the extension only when the browser reported no type", () => {
    // A member on a machine with no PDF mapping still gets to upload.
    expect(
      checkUploadMetadata(RESUME_UPLOAD_POLICY, {
        contentType: "",
        fileName: "Resume.PDF",
        size: 10,
      }),
    ).toMatchObject({ ok: true });
    expect(
      checkUploadMetadata(RESUME_UPLOAD_POLICY, {
        contentType: "application/octet-stream",
        fileName: "resume.pdf",
        size: 10,
      }),
    ).toMatchObject({ ok: true });

    // A declared type that is simply wrong is rejected, not re-labelled by
    // its extension. The resume client used to accept this and let the
    // server refuse it after the upload had already been sent.
    expect(
      checkUploadMetadata(RESUME_UPLOAD_POLICY, {
        contentType: "image/png",
        fileName: "actually-a-picture.pdf",
        size: 10,
      }),
    ).toMatchObject({ ok: false, reason: "wrong_type" });
    expect(
      checkUploadMetadata(RESUME_UPLOAD_POLICY, {
        contentType: "",
        fileName: "notes.txt",
        size: 10,
      }),
    ).toMatchObject({ ok: false, reason: "wrong_type" });
  });

  it("checks the type before the size, and tolerates MIME parameters and case", () => {
    expect(
      checkUploadMetadata(PROFILE_PICTURE_UPLOAD_POLICY, {
        contentType: "application/pdf",
        fileName: "huge.pdf",
        size: 50 * 1024 * 1024,
      }),
    ).toMatchObject({
      message: "Profile picture must be a JPEG, PNG, GIF, or WebP image.",
      reason: "wrong_type",
    });
    expect(
      checkUploadMetadata(PROFILE_PICTURE_UPLOAD_POLICY, {
        contentType: "Image/PNG; charset=binary",
        fileName: "big.png",
        size: 2 * 1024 * 1024 + 1,
      }),
    ).toMatchObject({
      message: "Profile picture must be 2MB or smaller.",
      reason: "too_large",
    });
    expect(
      checkUploadMetadata(PROFILE_PICTURE_UPLOAD_POLICY, {
        contentType: "image/png",
        fileName: "empty.png",
        size: 0,
      }),
    ).toMatchObject({
      message: "Profile picture data is missing or invalid.",
      reason: "empty",
    });
  });

  it("requires the bytes to match the resolved type on closed policies", () => {
    expect(
      checkUploadContent(PROFILE_PICTURE_UPLOAD_POLICY, {
        bytes: PDF_BYTES,
        contentType: "image/png",
        fileName: "trojan.png",
      }),
    ).toMatchObject({
      message: "Profile picture must be a valid image.",
      reason: "content_mismatch",
    });
    expect(
      checkUploadContent(RESUME_UPLOAD_POLICY, {
        bytes: PNG_BYTES,
        contentType: "application/pdf",
        fileName: "resume.pdf",
      }),
    ).toMatchObject({
      message: "Resume must be a valid PDF.",
      reason: "content_mismatch",
    });

    for (const [contentType, bytes] of [
      ["image/jpeg", JPEG_BYTES],
      ["image/png", PNG_BYTES],
      ["image/gif", GIF_BYTES],
      ["image/webp", WEBP_BYTES],
    ] as const) {
      expect(
        checkUploadContent(IMAGE_UPLOAD_POLICY, { bytes, contentType }),
      ).toMatchObject({ ok: true, type: { mimeType: contentType } });
    }
    expect(
      checkUploadContent(RESUME_UPLOAD_POLICY, {
        bytes: PDF_BYTES,
        contentType: "application/pdf",
      }),
    ).toMatchObject({ ok: true });
  });

  it("has a signature for every type a closed policy accepts", () => {
    for (const policy of [IMAGE_UPLOAD_POLICY, RESUME_UPLOAD_POLICY]) {
      for (const type of policy.types) {
        expect(
          matchesUploadSignature(type.mimeType, new Uint8Array()),
        ).not.toBe(null);
        expect(uploadExtension(type)).toMatch(/^[a-z0-9]+$/);
      }
    }
  });

  it("stores each accepted type under one canonical extension", () => {
    expect(IMAGE_UPLOAD_POLICY.types.map(uploadExtension)).toEqual([
      "jpg",
      "png",
      "gif",
      "webp",
    ]);
    expect(RESUME_UPLOAD_POLICY.types.map(uploadExtension)).toEqual(["pdf"]);
  });

  it("sizes the data-URL guard to the policy", () => {
    expect(maxDataUrlLength(RESUME_UPLOAD_POLICY)).toBe(
      Math.ceil((5 * 1000000 * 4) / 3) + 128,
    );
    expect(parseBase64DataUrl("data:image/png;base64,AAAA")).toEqual({
      base64: "AAAA",
      contentType: "image/png",
    });
    expect(parseBase64DataUrl("data:;base64,AAAA")).toEqual({
      base64: "AAAA",
      contentType: "",
    });
    expect(parseBase64DataUrl("data:image/png,AAAA")).toBeNull();
    expect(parseBase64DataUrl("https://example.test/x.png")).toBeNull();
  });
});

describe("form attachment bound", () => {
  it("stays family-shaped so phone-native formats still upload", () => {
    for (const contentType of [
      "image/heic",
      "video/quicktime",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/csv",
    ]) {
      expect(
        validateFormUpload({ contentType, fileName: "file.bin", size: 512 }),
      ).toEqual({ allowed: true });
    }
  });

  it("refuses scriptable documents that the image family used to wave through", () => {
    for (const [contentType, fileName] of [
      ["image/svg+xml", "logo.svg"],
      ["text/html", "page.html"],
      ["application/xhtml+xml", "page.xhtml"],
      // Declared as something harmless but named so a browser executes it.
      ["text/plain", "payload.html"],
      ["image/png", "drawing.svg"],
      ["application/zip", "applet.jar"],
    ] as const) {
      expect(
        validateFormUpload({ contentType, fileName, size: 512 }),
      ).toMatchObject({ allowed: false, reason: "unsafe_type" });
    }
  });

  it("applies a question's own limits through the same gate", () => {
    const question = {
      allowedMimeTypes: ["application/pdf", "image/*"],
      maxBytes: 5 * 1024 * 1024,
    };
    expect(
      validateFormUpload({
        ...question,
        contentType: "image/png",
        fileName: "chart.png",
        size: 1_000,
      }),
    ).toEqual({ allowed: true });
    expect(
      validateFormUpload({
        ...question,
        contentType: "text/csv",
        fileName: "rows.csv",
        size: 1_000,
      }),
    ).toMatchObject({
      message: "That file type is not allowed.",
      reason: "unsafe_type",
    });
    expect(
      validateFormUpload({
        ...question,
        contentType: "application/pdf",
        fileName: "big.pdf",
        size: 5 * 1024 * 1024 + 1,
      }),
    ).toMatchObject({
      message: "Files may not exceed 5 MB.",
      reason: "too_large",
    });
    // A question may never widen past the platform bound.
    expect(
      validateFormUpload({
        allowedMimeTypes: ["image/*"],
        contentType: "image/svg+xml",
        fileName: "logo.svg",
        maxBytes: 5 * 1024 * 1024,
        size: 10,
      }),
    ).toMatchObject({ allowed: false, reason: "unsafe_type" });
  });

  it("matches question wildcards the same way the server does", () => {
    expect(mimeTypeAllowed("IMAGE/PNG; charset=x", ["image/*"])).toBe(true);
    expect(mimeTypeAllowed("image/png", ["application/pdf"])).toBe(false);
    expect(mimeTypeAllowed("image/png", ["image/png"])).toBe(true);
  });

  it("refuses program images whatever they claim to be", () => {
    expect(hasExecutableSignature(new Uint8Array([0x4d, 0x5a, 0x90]))).toBe(
      true,
    );
    expect(
      hasExecutableSignature(new Uint8Array(Buffer.from("#!/bin/sh"))),
    ).toBe(true);
    expect(hasExecutableSignature(PDF_BYTES)).toBe(false);
  });

  it("has no opinion on a type with no known signature", () => {
    expect(matchesUploadSignature("image/heic", PNG_BYTES)).toBeNull();
    expect(matchesUploadSignature("application/pdf", PDF_BYTES)).toBe(true);
    expect(matchesUploadSignature("application/pdf", PNG_BYTES)).toBe(false);
  });
});
