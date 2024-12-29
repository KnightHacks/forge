import { Client } from "minio";
import { protectedProcedure } from "../trpc";
import { z } from "zod";
import { env } from "../env";

const s3Client = new Client({
    endPoint: "",
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
});

export const resumeUploadRouter = {
    uploadResume: protectedProcedure.input(
        z.object({
            fileName: z.string(),
            fileContent: z.instanceof(File),
        })
    )
    .mutation(async ({ input, ctx }) => {
        const { fileName, fileContent } = input;

        const bucketName = "member-resumes";
        const objectName = `${ctx.session.user.id}/${fileName}`;

        // todo add upload logic
    })
};

