import type { TRPCRouterRecord } from "@trpc/server";
import type { BucketItem } from "minio";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { KNIGHTHACKS_S3_BUCKET_REGION } from "@forge/consts/knight-hacks";
import { and, count, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Member } from "@forge/db/schemas/knight-hacks";

import { env } from "../env";
import { minioClient } from "../minio/minio-client";
import { protectedProcedure, publicProcedure } from "../trpc";

const GUILD_PROFILE_PICTURES_BUCKET_NAME = "guild-profile-pictures";

export const guildRouter = {
  uploadProfilePicture: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileContent: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { fileName, fileContent } = input;

      const base64PrefixMatch = /^data:(image\/[a-zA-Z]+);base64,/.exec(
        fileContent,
      );
      const contentType = base64PrefixMatch
        ? base64PrefixMatch[1]
        : "application/octet-stream";
      const base64Data = fileContent.substring(
        base64PrefixMatch?.[0]?.length ?? 0,
      );

      if (!base64Data) {
        console.error("uploadProfilePicture: Base64 data is missing.");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Base64 data is missing or invalid after stripping prefix.",
        });
      }

      const fileBuffer = Buffer.from(base64Data, "base64");
      const userDirectory = `${ctx.session.user.id}/`;
      const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const objectName = `${userDirectory}${Date.now()}-${safeFileName}`;

      try {
        const bucketExists = await minioClient.bucketExists(
          GUILD_PROFILE_PICTURES_BUCKET_NAME,
        );
        if (!bucketExists) {
          await minioClient.makeBucket(
            GUILD_PROFILE_PICTURES_BUCKET_NAME,
            KNIGHTHACKS_S3_BUCKET_REGION,
          );
        }
      } catch (e) {
        console.error(
          "uploadProfilePicture: Error checking/creating bucket:",
          e,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not ensure Minio bucket.",
        });
      }

      const existingObjects: string[] = [];
      try {
        const stream = minioClient.listObjects(
          GUILD_PROFILE_PICTURES_BUCKET_NAME,
          userDirectory,
          true,
        ) as AsyncIterable<BucketItem>;
        for await (const obj of stream) {
          if (obj.name) {
            existingObjects.push(obj.name);
          }
        }
      } catch (e) {
        console.warn(
          "uploadProfilePicture: Error listing existing profile pictures, proceeding with upload:",
          e,
        );
      }

      if (existingObjects.length > 0) {
        try {
          await minioClient.removeObjects(
            GUILD_PROFILE_PICTURES_BUCKET_NAME,
            existingObjects,
          );
        } catch (e) {
          console.error(
            "uploadProfilePicture: Error removing existing profile pictures:",
            e,
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not remove existing profile pictures.",
          });
        }
      }

      try {
        await minioClient.putObject(
          GUILD_PROFILE_PICTURES_BUCKET_NAME,
          objectName,
          fileBuffer,
          fileBuffer.length,
          { "Content-Type": contentType },
        );
      } catch (e) {
        console.error(
          "uploadProfilePicture: Error uploading profile picture to Minio:",
          e,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not upload profile picture.",
        });
      }

      const publicUrl = `https://${env.MINIO_ENDPOINT}/${GUILD_PROFILE_PICTURES_BUCKET_NAME}/${objectName}`;

      return { profilePictureUrl: publicUrl };
    }),

  getGuildMembers: publicProcedure
    .input(
      z.object({
        page: z.number().int().min(0).default(0),
        pageSize: z.number().int().min(1).max(100).default(25),
        query: z.string().trim().min(1).max(80).optional(),
        tags: z.array(z.enum(["alumni", "current"])).optional(),
      }),
    )
    .query(async ({ input }) => {
      const { page, pageSize, query, tags } = input;

      const filters: ReturnType<typeof sql.raw>[] = [
        sql`${Member.guildProfileVisible} = TRUE`,
      ];

      const hasAlumni = tags?.includes("alumni") ?? false;
      const hasCurrent = tags?.includes("current") ?? false;

      if (hasAlumni && !hasCurrent) {
        filters.push(sql`${Member.gradDate} <  CURRENT_DATE`);
      } else if (hasCurrent && !hasAlumni) {
        filters.push(sql`${Member.gradDate} >= CURRENT_DATE`);
      }

      if (query) {
        const pattern = `%${query}%`;
        filters.push(
          sql`(${Member.firstName} ILIKE ${pattern}
                OR ${Member.lastName}  ILIKE ${pattern}
                OR ${Member.tagline}   ILIKE ${pattern})`,
        );
      }

      const whereExpr = filters.length === 1 ? filters[0] : and(...filters);

      const cols = {
        id: Member.id,
        firstName: Member.firstName,
        lastName: Member.lastName,
        tagline: Member.tagline,
        about: Member.about,
        profilePictureUrl: Member.profilePictureUrl,
        gradDate: Member.gradDate,
        school: Member.school,
        githubProfileUrl: Member.githubProfileUrl,
        linkedinProfileUrl: Member.linkedinProfileUrl,
        websiteUrl: Member.websiteUrl,
        resumeUrl: Member.resumeUrl,
        dateCreated: Member.dateCreated,
      } as const;

      const baseQuery = db.select(cols).from(Member).where(whereExpr);

      const members =
        !query && page === 0
          ? await baseQuery.orderBy(sql`RANDOM()`).limit(pageSize)
          : await baseQuery
              .orderBy(Member.firstName, Member.lastName, Member.id)
              .limit(pageSize)
              .offset(page * pageSize);

      const total =
        (await db.select({ count: count() }).from(Member).where(whereExpr))[0]
          ?.count ?? 0;

      return { members, total };
    }),
} satisfies TRPCRouterRecord;
