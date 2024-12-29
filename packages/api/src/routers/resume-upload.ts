import { Client } from "minio";
import { protectedProcedure } from "../trpc";
import { z } from "zod";
import { env } from "../env";

const s3Client = new Client({
    endPoint: env.MINIO_ENDPOINT,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
});

export const resumeUploadRouter = {
    uploadResume: protectedProcedure.input(
        z.instanceof(File)
    )
    .mutation(async ({ input, ctx }) => {
        const bucketName = "member-resumes";
        const objectName = `${ctx.session.user.id}/${input.name}`;

        // Ensure bucket exists
        const bucketExists = await s3Client.bucketExists(bucketName);
        if (!bucketExists) {
          await s3Client.makeBucket(bucketName, "us-east-1");
        }

        await s3Client.putObject(bucketName, objectName, file);
        const resumeUrl = `https://${env.MINIO_ENDPOINT}/${bucketName}/${objectName}`;
    })
};

