import type { ItemBucketMetadata } from "minio";
import { TRPCError } from "@trpc/server";
import { Client } from "minio";
import { z } from "zod";

import { KNIGHTHACKS_S3_BUCKET_REGION } from "@forge/consts/knight-hacks";

import { env } from "../env";
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
        fileContent: z.string(), // Base-64 encoded
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { fileName, fileContent } = input;

      // Decode Base64 to Buffer
      const base64Data = fileContent.split(",")[1]; // Remove metadata prefix
      if (base64Data) {
        const fileBuffer = Buffer.from(base64Data, "base64");

        const bucketName = "member-resumes";
        const userDirectory = `${ctx.session.user.id}/`;
        const filePath = `${userDirectory}${fileName}`;

        // Ensure bucket exists
        const bucketExists = await s3Client.bucketExists(bucketName);
        if (!bucketExists) {
          await s3Client.makeBucket(bucketName, KNIGHTHACKS_S3_BUCKET_REGION);
        }

        // Overwrite any existing resume associated with the user
        const existingResumes = [];
        const objectStream = s3Client.listObjects(
          bucketName,
          userDirectory,
          true,
        );
        for await (const obj of objectStream as AsyncIterable<ItemBucketMetadata>) {
          existingResumes.push(obj.name);
        }

        if (existingResumes.length > 0) {
          await Promise.all(
            existingResumes.map(async (objectName: string) => {
              await s3Client.removeObject(bucketName, objectName);
            }),
          );
        }

        await s3Client.putObject(bucketName, filePath, fileBuffer);

        // Path to the resume within the bucket
        return filePath;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Base64 data is missing or invalid",
        });
      }
    }),
  getResume: protectedProcedure.query(async ({ ctx }) => {
    const bucketName = "member-resumes";
    const filename = `${ctx.session.user.id}/Resume.pdf`;

    try {
      // Make sure the file actually exists
      await s3Client.statObject(bucketName, filename);
    } catch {
      throw new TRPCError({ code: "NOT_FOUND", message: "Resume not found" });
    }

    try {
      const expiresIn = 60 * 60; // 1 hour
      const presignedUrl = await s3Client.presignedUrl(
        "GET",
        bucketName,
        filename,
        expiresIn,
      );

      return { url: presignedUrl };
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not generate presigned URL",
      });
    }
  }),
};
