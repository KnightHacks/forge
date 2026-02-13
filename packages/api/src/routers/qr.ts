import type { TRPCRouterRecord } from "@trpc/server";
import QRCode from "qrcode";

import { MINIO } from "@forge/consts";

import { minioClient } from "../minio/minio-client";
import { protectedProcedure } from "../trpc";

export const qrRouter = {
  getQRCode: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const objectName = `qr-code-${userId}.png`;

    try {
      try {
        await minioClient.statObject(MINIO.QR_BUCKET_NAME, objectName);
      } catch {
        const bucketExists = await minioClient.bucketExists(
          MINIO.QR_BUCKET_NAME,
        );
        if (!bucketExists) {
          await minioClient.makeBucket(
            MINIO.QR_BUCKET_NAME,
            MINIO.BUCKET_REGION,
          );
        }
        const qrData = `user:${userId}`;
        const qrBuffer = await QRCode.toBuffer(qrData, { type: "png" });
        await minioClient.putObject(
          MINIO.QR_BUCKET_NAME,
          objectName,
          qrBuffer,
          qrBuffer.length,
          { "Content-Type": "image/png" },
        );
      }

      const qrCodeUrl = await minioClient.presignedGetObject(
        MINIO.QR_BUCKET_NAME,
        objectName,
        60 * 60 * 24,
      );

      return { qrCodeUrl };
    } catch {
      throw new Error("Failed to fetch the QR code URL.");
    }
  }),
} satisfies TRPCRouterRecord;
