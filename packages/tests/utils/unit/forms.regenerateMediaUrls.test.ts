import { describe, expect, it, vi } from "vitest";

import type { FORMS } from "@forge/consts";
import { regenerateMediaUrls } from "@forge/utils/forms";

describe("regenerateMediaUrls", () => {
  it("should return empty array when instructions is undefined", async () => {
    const mockMinioClient = {
      presignedGetObject: vi.fn(),
    };

    const result = await regenerateMediaUrls(undefined, mockMinioClient);

    expect(result).toEqual([]);
    expect(mockMinioClient.presignedGetObject).not.toHaveBeenCalled();
  });

  it("should return empty array when instructions is empty", async () => {
    const mockMinioClient = {
      presignedGetObject: vi.fn(),
    };

    const result = await regenerateMediaUrls([], mockMinioClient);

    expect(result).toEqual([]);
    expect(mockMinioClient.presignedGetObject).not.toHaveBeenCalled();
  });

  it("should regenerate image URL when imageObjectName exists", async () => {
    const mockPresignedUrl = "https://example.com/presigned-image-url";
    const mockMinioClient = {
      presignedGetObject: vi.fn().mockResolvedValue(mockPresignedUrl),
    };

    const instructions: FORMS.InstructionValidatorType[] = [
      {
        imageObjectName: "test-image.jpg",
        order: 0,
      },
    ];

    const result = await regenerateMediaUrls(instructions, mockMinioClient);

    expect(result).toHaveLength(1);
    expect(result[0]?.imageUrl).toBe(mockPresignedUrl);
    expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
      "form-assets",
      "test-image.jpg",
      604800, // 7 days in seconds
    );
  });

  it("should regenerate video URL when videoObjectName exists", async () => {
    const mockPresignedUrl = "https://example.com/presigned-video-url";
    const mockMinioClient = {
      presignedGetObject: vi.fn().mockResolvedValue(mockPresignedUrl),
    };

    const instructions: FORMS.InstructionValidatorType[] = [
      {
        videoObjectName: "test-video.mp4",
        order: 0,
      },
    ];

    const result = await regenerateMediaUrls(instructions, mockMinioClient);

    expect(result).toHaveLength(1);
    expect(result[0]?.videoUrl).toBe(mockPresignedUrl);
    expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
      "form-assets",
      "test-video.mp4",
      604800, // 7 days in seconds
    );
  });

  it("should regenerate both image and video URLs", async () => {
    const mockImageUrl = "https://example.com/presigned-image-url";
    const mockVideoUrl = "https://example.com/presigned-video-url";
    const mockMinioClient = {
      presignedGetObject: vi
        .fn()
        .mockResolvedValueOnce(mockImageUrl)
        .mockResolvedValueOnce(mockVideoUrl),
    };

    const instructions: FORMS.InstructionValidatorType[] = [
      {
        imageObjectName: "test-image.jpg",
        videoObjectName: "test-video.mp4",
        order: 0,
      },
    ];

    const result = await regenerateMediaUrls(instructions, mockMinioClient);

    expect(result).toHaveLength(1);
    expect(result[0]?.imageUrl).toBe(mockImageUrl);
    expect(result[0]?.videoUrl).toBe(mockVideoUrl);
    expect(mockMinioClient.presignedGetObject).toHaveBeenCalledTimes(2);
  });

  it("should handle multiple instructions", async () => {
    const mockPresignedUrl = "https://example.com/presigned-url";
    const mockMinioClient = {
      presignedGetObject: vi.fn().mockResolvedValue(mockPresignedUrl),
    };

    const instructions: FORMS.InstructionValidatorType[] = [
      {
        imageObjectName: "image1.jpg",
        order: 0,
      },
      {
        imageObjectName: "image2.jpg",
        order: 1,
      },
    ];

    const result = await regenerateMediaUrls(instructions, mockMinioClient);

    expect(result).toHaveLength(2);
    expect(result[0]?.imageUrl).toBe(mockPresignedUrl);
    expect(result[1]?.imageUrl).toBe(mockPresignedUrl);
    expect(mockMinioClient.presignedGetObject).toHaveBeenCalledTimes(2);
  });

  it("should preserve other instruction properties", async () => {
    const mockPresignedUrl = "https://example.com/presigned-url";
    const mockMinioClient = {
      presignedGetObject: vi.fn().mockResolvedValue(mockPresignedUrl),
    };

    const instructions: FORMS.InstructionValidatorType[] = [
      {
        imageObjectName: "test-image.jpg",
        order: 5,
      },
    ];

    const result = await regenerateMediaUrls(instructions, mockMinioClient);

    expect(result).toHaveLength(1);
    expect(result[0]?.order).toBe(5);
    expect(result[0]?.imageUrl).toBe(mockPresignedUrl);
  });

  it("should handle errors gracefully when presignedGetObject fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const mockMinioClient = {
      presignedGetObject: vi.fn().mockRejectedValue(new Error("MinIO error")),
    };

    const instructions: FORMS.InstructionValidatorType[] = [
      {
        imageObjectName: "test-image.jpg",
        order: 0,
      },
    ];

    const result = await regenerateMediaUrls(instructions, mockMinioClient);

    expect(result).toHaveLength(1);
    expect(result[0]?.imageUrl).toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("should handle instructions without imageObjectName or videoObjectName", async () => {
    const mockMinioClient = {
      presignedGetObject: vi.fn(),
    };

    const instructions: FORMS.InstructionValidatorType[] = [
      {
        order: 0,
      },
    ];

    const result = await regenerateMediaUrls(instructions, mockMinioClient);

    expect(result).toHaveLength(1);
    expect(result[0]?.order).toBe(0);
    expect(mockMinioClient.presignedGetObject).not.toHaveBeenCalled();
  });
});
