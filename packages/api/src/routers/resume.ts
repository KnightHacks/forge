import { z } from "zod";

import { db } from "@forge/db/client";

import { protectedProcedure } from "../trpc";
import { MAX_RESUME_DATA_URL_LENGTH } from "../utils/resume/security";
import {
  getResumeDownloadUrlForSession,
  saveMemberResumeForSession,
  uploadResumeForSession,
} from "../utils/resume/storage";

export const resumeRouter = {
  uploadResume: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        fileContent: z.string().max(MAX_RESUME_DATA_URL_LENGTH),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await uploadResumeForSession({
        fileContent: input.fileContent,
        session: ctx.session,
      });
    }),

  saveMemberResume: protectedProcedure
    .input(
      z.object({
        resumeUrl: z.string().trim().max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await saveMemberResumeForSession({
        database: db,
        resumeUrl: input.resumeUrl,
        session: ctx.session,
      });
    }),

  getResume: protectedProcedure.query(async ({ ctx }) => {
    return await getResumeDownloadUrlForSession(ctx.session);
  }),
};
