import QRCode from "qrcode";

import { MINIO } from "@forge/consts";

import { minioClient } from "./minio/minio-client";

export function getUserQRCodeObjectName(userId: string) {
  return `qr-code-${userId}.png`;
}

export async function ensureUserQRCode(userId: string) {
  const objectName = getUserQRCodeObjectName(userId);

  const bucketExists = await minioClient.bucketExists(MINIO.QR_BUCKET_NAME);
  if (!bucketExists) {
    await minioClient.makeBucket(MINIO.QR_BUCKET_NAME, MINIO.BUCKET_REGION);
  }

  try {
    await minioClient.statObject(MINIO.QR_BUCKET_NAME, objectName);
    return objectName;
  } catch {
    const qrData = `user:${userId}`;
    const qrBuffer = await QRCode.toBuffer(qrData, { type: "png" });
    await minioClient.putObject(
      MINIO.QR_BUCKET_NAME,
      objectName,
      qrBuffer,
      qrBuffer.length,
      { "Content-Type": "image/png" },
    );

    return objectName;
  }
}
