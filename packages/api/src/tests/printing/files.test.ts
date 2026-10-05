import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getPrintFileDownloadUrl,
  printFileName,
} from "../../utils/printing/files";

vi.mock("@forge/db/client", () => ({ db: {} }));
const storage = vi.hoisted(() => ({
  statObject: vi.fn(),
  presignedGetObject: vi.fn().mockResolvedValue("https://storage.test/file"),
}));
vi.mock("../../minio/minio-client", () => ({ minioClient: storage }));

describe("printing download boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.statObject.mockResolvedValue({
      metaData: { "print-validation": "stl-images-v1" },
    });
  });

  it("preserves the allowed extension when sanitizing long or misleading names", () => {
    for (const name of [
      "a".repeat(176) + ".cmd.stl",
      "a".repeat(175) + ".html.stl",
      "../../payload.cmd.stl",
    ]) {
      const safe = printFileName(name);
      expect(safe).toMatch(/^[a-zA-Z0-9 _-]+\.stl$/);
      expect(safe.length).toBeLessThanOrEqual(180);
    }
    expect(printFileName("reference.JPEG")).toBe("reference.jpg");
    expect(() => printFileName("payload.cmd")).toThrow();
    expect(() => printFileName("project.3mf")).toThrow();
  });

  it("requires current server validation before generating an attachment URL", async () => {
    const file = {
      contentType: "model/stl",
      fileName: "a".repeat(176) + ".cmd.stl",
      objectName: "opaque-key",
    };
    await getPrintFileDownloadUrl(file);
    expect(storage.presignedGetObject).toHaveBeenCalledWith(
      expect.any(String),
      "opaque-key",
      600,
      {
        "response-content-disposition": `attachment; filename="${printFileName(file.fileName)}"`,
        "response-content-type": "application/octet-stream",
      },
    );
    storage.presignedGetObject.mockClear();
    storage.statObject.mockResolvedValue({ metaData: {} });
    await expect(getPrintFileDownloadUrl(file)).rejects.toThrow(
      "upload it again",
    );
    expect(storage.presignedGetObject).not.toHaveBeenCalled();
  });

  it("refuses metadata/name disagreement and missing objects", async () => {
    await expect(
      getPrintFileDownloadUrl({
        contentType: "text/html",
        fileName: "photo.png",
        objectName: "x",
      }),
    ).rejects.toThrow("no longer supported");
    storage.statObject.mockRejectedValue(new Error("NoSuchKey"));
    await expect(
      getPrintFileDownloadUrl({
        contentType: "model/stl",
        fileName: "part.stl",
        objectName: "x",
      }),
    ).rejects.toThrow("NoSuchKey");
    expect(storage.presignedGetObject).not.toHaveBeenCalled();
  });
});
