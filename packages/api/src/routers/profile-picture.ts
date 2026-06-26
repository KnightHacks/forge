import { z } from "zod";

import { db } from "@forge/db/client";

import { protectedProcedure } from "../trpc";
import { MAX_PROFILE_PICTURE_DATA_URL_LENGTH } from "../utils/profile-picture/security";
import {
  getProfilePictureDownloadUrlForSession,
  saveMemberProfilePictureForSession,
  uploadProfilePictureForSession,
} from "../utils/profile-picture/storage";

export const profilePictureRouter = {
  uploadProfilePicture: protectedProcedure
    .input(
      z.object({
        fileContent: z.string().max(MAX_PROFILE_PICTURE_DATA_URL_LENGTH),
        fileName: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await uploadProfilePictureForSession({
        fileContent: input.fileContent,
        session: ctx.session,
      });
    }),

  saveMemberProfilePicture: protectedProcedure
    .input(
      z.object({
        profilePictureUrl: z.string().trim().max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await saveMemberProfilePictureForSession({
        database: db,
        profilePictureUrl: input.profilePictureUrl,
        session: ctx.session,
      });
    }),

  getProfilePicture: protectedProcedure.query(async ({ ctx }) => {
    return await getProfilePictureDownloadUrlForSession(ctx.session);
  }),
};
