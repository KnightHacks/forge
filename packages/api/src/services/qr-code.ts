import type { Readable } from "stream";
import QRCode from "qrcode";

import { MINIO } from "@forge/consts";

import { minioClient } from "../minio/minio-client";

export function getUserQRCodeObjectName(userId: string) {
  return `qr-code-${userId}.png`;
}

export function getUserQRCodePayload(userId: string) {
  return `user:${userId}`;
}

function isObjectNotFoundError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;

  const { code } = error as { code?: unknown };

  return code === "NotFound" || code === "NoSuchKey";
}

async function streamToBuffer(stream: Readable) {
  const chunks: Buffer[] = [];

  for await (const chunk of stream as AsyncIterable<
    Buffer | string | Uint8Array
  >) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
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
  } catch (error) {
    if (!isObjectNotFoundError(error)) {
      throw error;
    }

    const qrData = getUserQRCodePayload(userId);
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

export async function getUserQRCodeDataUrl(userId: string) {
  const objectName = await ensureUserQRCode(userId);
  const qrStream = await minioClient.getObject(
    MINIO.QR_BUCKET_NAME,
    objectName,
  );
  const qrBuffer = await streamToBuffer(qrStream);

  return `data:${MINIO.QR_CONTENT_TYPE};base64,${qrBuffer.toString("base64")}`;
}
