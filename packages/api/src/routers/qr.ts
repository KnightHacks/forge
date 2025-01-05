import type { TRPCRouterRecord } from "@trpc/server";
import QRCode from "qrcode";

import { env } from "../env";
import { minioClient } from "../minio/minio-client";
import { protectedProcedure } from "../trpc";

export const qrRouter = {
  generateQRCodeAndUpload: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const bucketName = "knight-hacks-qr";
    const objectName = `qr-code-${userId}.png`;

    try {
      const bucketExists = await minioClient.bucketExists(bucketName);

      if (!bucketExists) {
        await minioClient.makeBucket(bucketName, "us-east-1");
      }

      const qrData = `user:${userId}`;
      const qrBuffer = await QRCode.toBuffer(qrData);

      await minioClient.putObject(
        bucketName,
        objectName,
        qrBuffer,
        qrBuffer.length,
        {
          "Content-Type": "image/png",
        },
      );

      const qrCodeUrl = `${env.MINIO_ENDPOINT}/${bucketName}/${objectName}}`;

      return { success: true, qrCodeUrl };
    } catch {
      throw new Error("Failed to generate or upload the QR Code");
    }
  }),

  getQRCode: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const bucketName = "knight-hacks-qr";
    const objectName = `qr-code-${userId}.png`;

    try {
      const qrCodeUrl = await minioClient.presignedGetObject(
        bucketName,
        objectName,
        60 * 60 * 24,
      );
      return { qrCodeUrl };
    } catch {
      throw new Error("Failed to fetch the QR code URL.");
    }
  }),
} satisfies TRPCRouterRecord;
