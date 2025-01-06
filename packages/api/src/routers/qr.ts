import type { TRPCRouterRecord } from "@trpc/server";

import { BUCKET_NAME } from "@forge/consts/knight-hacks";

import { minioClient } from "../minio/minio-client";
import { protectedProcedure } from "../trpc";

export const qrRouter = {
  getQRCode: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const objectName = `qr-code-${userId}.png`;

    try {
      const qrCodeUrl = await minioClient.presignedGetObject(
        BUCKET_NAME,
        objectName,
        60 * 60 * 24,
      );
      return { qrCodeUrl };
    } catch {
      throw new Error("Failed to fetch the QR code URL.");
    }
  }),
} satisfies TRPCRouterRecord;
