import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@forge/db/client";
import { logger } from "@forge/utils";

import {
  createResumeObjectName,
  decodeAndValidateResumeDataUrl,
  MAX_RESUME_DATA_URL_LENGTH,
  normalizeOwnedResumeObjectName,
  RESUME_BUCKET_NAME,
} from "../resume-security";
import {
  ensureResumeBucketExists,
  resumeStorageClient,
} from "../resume-storage";
import { protectedProcedure } from "../trpc";

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
      const filePath = createResumeObjectName(ctx.session.user.id);

      await ensureResumeBucketExists();

      await resumeStorageClient.putObject(
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
      const presignedUrl = await resumeStorageClient.presignedUrl(
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
