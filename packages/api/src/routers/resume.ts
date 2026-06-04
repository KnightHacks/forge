import type { ItemBucketMetadata } from "minio";
import { TRPCError } from "@trpc/server";
import { Client } from "minio";
import { z } from "zod";

import { MINIO } from "@forge/consts";
import { db } from "@forge/db/client";
import { logger } from "@forge/utils";

import { env } from "../env";
import {
  createResumeObjectName,
  decodeAndValidateResumeDataUrl,
  getResumeUserPrefix,
  MAX_RESUME_DATA_URL_LENGTH,
  normalizeOwnedResumeObjectName,
  RESUME_BUCKET_NAME,
} from "../resume-security";
import { protectedProcedure } from "../trpc";

const s3Client = new Client({
  endPoint: env.MINIO_ENDPOINT,
  useSSL: true,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export const resumeRouter = {
  uploadResume: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileContent: z.string().max(MAX_RESUME_DATA_URL_LENGTH), // Base-64 encoded PDF data URL
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { fileContent } = input;
      const fileBuffer = decodeAndValidateResumeDataUrl(fileContent);
      const userDirectory = getResumeUserPrefix(ctx.session.user.id);
      const filePath = createResumeObjectName(ctx.session.user.id);

      // Ensure bucket exists
      const bucketExists = await s3Client.bucketExists(RESUME_BUCKET_NAME);
      if (!bucketExists) {
        await s3Client.makeBucket(RESUME_BUCKET_NAME, MINIO.BUCKET_REGION);
      }

      // Overwrite any existing resume associated with the user
      const existingResumes = [];
      const objectStream = s3Client.listObjects(
        RESUME_BUCKET_NAME,
        userDirectory,
        true,
      );
      for await (const obj of objectStream as AsyncIterable<ItemBucketMetadata>) {
        existingResumes.push(obj.name);
      }

      if (existingResumes.length > 0) {
        await Promise.all(
          existingResumes.map(async (objectName: string) => {
            await s3Client.removeObject(RESUME_BUCKET_NAME, objectName);
          }),
        );
      }

      await s3Client.putObject(
        RESUME_BUCKET_NAME,
        filePath,
        fileBuffer,
        fileBuffer.length,
        { "Content-Type": "application/pdf" },
      );

      // Path to the resume within the bucket
      return filePath;
    }),
  getResume: protectedProcedure.query(async ({ ctx }) => {
    // Find a member resume
    const member = await db.query.Member.findFirst({
      where: (t, { eq }) => eq(t.userId, ctx.session.user.id),
    });

    // Find a hacker resume
    const hacker = await db.query.Hacker.findFirst({
      where: (t, { eq }) => eq(t.userId, ctx.session.user.id),
    });

    // If neither member nor hacker found, return null
    if (!member && !hacker) {
      logger.error("No resume found for user");
      return { url: null };
    }

    const filename = normalizeOwnedResumeObjectName(
      member?.resumeUrl ?? hacker?.resumeUrl,
      ctx.session.user.id,
    );

    if (!filename) {
      logger.error("No resume URL found for user");
      return { url: null };
    }

    try {
      const expiresIn = 60 * 60; // 1 hour
      const presignedUrl = await s3Client.presignedUrl(
        "GET",
        RESUME_BUCKET_NAME,
        filename,
        expiresIn,
      );

      // Return the URL to the client
      return { url: presignedUrl };
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not generate presigned URL",
      });
    }
  }),
};
