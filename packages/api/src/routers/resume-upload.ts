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
        z.object({
            fileName: z.string(),
            fileContent: z.string(), // Base-64 encoded
        })
    )
    .mutation(async ({ input, ctx }) => {
        const { fileName, fileContent } = input; 
        
        // Decode Base64 to Buffer
        const base64Data = fileContent.split(',')[1]; // Remove metadata prefix
        const fileBuffer = Buffer.from(base64Data, 'base64');

        const bucketName = "member-resumes";
        const objectName = `${ctx.session.user.id}/${fileName}`;

        // Ensure bucket exists
        const bucketExists = await s3Client.bucketExists(bucketName);
        if (!bucketExists) {
          await s3Client.makeBucket(bucketName, "us-east-1");
        }

        await s3Client.putObject(bucketName, objectName, fileBuffer);
        
        // For adding user's resume url to members table
        return `https://${env.MINIO_ENDPOINT}/${bucketName}/${objectName}`;
    })
};

