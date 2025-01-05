import type { TRPCRouterRecord } from "@trpc/server";
import QRCode from "qrcode";

import {
  BUCKET_NAME,
  KNIGHTHACKS_S3_BUCKET_REGION,
  QR_CONTENT_TYPE,
} from "@forge/consts/knight-hacks";

import { env } from "../env";
import { minioClient } from "../minio/minio-client";
import { protectedProcedure } from "../trpc";

export const qrRouter = {
  generateQRCodeAndUpload: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const objectName = `qr-code-${userId}.png`;

    try {
      const bucketExists = await minioClient.bucketExists(BUCKET_NAME);

      if (!bucketExists) {
        await minioClient.makeBucket(BUCKET_NAME, KNIGHTHACKS_S3_BUCKET_REGION);
      }

      const qrData = `user:${userId}`;
      const qrBuffer = await QRCode.toBuffer(qrData);

      await minioClient.putObject(
        BUCKET_NAME,
        objectName,
        qrBuffer,
        qrBuffer.length,
        {
          "Content-Type": QR_CONTENT_TYPE,
        },
      );

      const qrCodeUrl = `${env.MINIO_ENDPOINT}/${BUCKET_NAME}/${objectName}}`;

      return { success: true, qrCodeUrl };
    } catch {
      throw new Error("Failed to generate or upload the QR Code");
    }
  }),

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
