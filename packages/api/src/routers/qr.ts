import type { TRPCRouterRecord } from "@trpc/server";
import QRCode from "qrcode";

import { BUCKET_NAME, KNIGHTHACKS_S3_BUCKET_REGION } from "@forge/consts";

import { minioClient } from "../minio/minio-client";
import { protectedProcedure } from "../trpc";

export const qrRouter = {
  getQRCode: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const objectName = `qr-code-${userId}.png`;

    try {
      try {
        await minioClient.statObject(BUCKET_NAME, objectName);
      } catch {
        const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
        if (!bucketExists) {
          await minioClient.makeBucket(
            BUCKET_NAME,
            KNIGHTHACKS_S3_BUCKET_REGION,
          );
        }
        const qrData = `user:${userId}`;
        const qrBuffer = await QRCode.toBuffer(qrData, { type: "png" });
        await minioClient.putObject(
          BUCKET_NAME,
          objectName,
          qrBuffer,
          qrBuffer.length,
          { "Content-Type": "image/png" },
        );
      }

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
