import type { TRPCRouterRecord } from "@trpc/server";
import type { BucketItem } from "minio";
import { TRPCError } from "@trpc/server";
import { Client } from "minio";
import { z } from "zod";

import { MINIO, TEAM } from "@forge/consts";
import { and, count, eq, ilike, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import { Member } from "@forge/db/schemas/knight-hacks";
import { logger } from "@forge/utils";

import { env } from "../env";
import { minioClient } from "../minio/minio-client";
import {
  normalizeOwnedResumeObjectName,
  RESUME_BUCKET_NAME,
} from "../resume-security";
import { protectedProcedure, publicProcedure } from "../trpc";

const s3Client = new Client({
  endPoint: env.MINIO_ENDPOINT,
  useSSL: true,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

interface PublicClubTeamMember {
  id: string;
  name: string;
  teamRole: string;
  imageUrl: string | null;
  linkedinUrl: string | null;
  color: string | null;
}

type PublicClubTeamRoster = Record<TEAM.ClubTeamSlug, PublicClubTeamMember[]>;

function createEmptyPublicClubRoster(): PublicClubTeamRoster {
  return TEAM.CLUB_TEAM_DEFINITIONS.reduce((roster, team) => {
    roster[team.slug] = [];
    return roster;
  }, {} as PublicClubTeamRoster);
}

function getFullName({
  firstName,
  lastName,
  displayName,
}: {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
}) {
  const memberName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (memberName.length > 0) return memberName;
  if (displayName?.trim()) return displayName.trim();

  return "Knight Hacks Member";
}

function toNonEmptyString(value: string | null) {
  const trimmedValue = value?.trim();

  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : null;
}

function getMatchingClubTeam(roleName: string) {
  const normalizedRoleName = roleName.toLowerCase();

  return (
    TEAM.CLUB_TEAM_DEFINITIONS.find((team) =>
      team.terms.some((term) => normalizedRoleName.includes(term)),
    ) ?? null
  );
}

function getSpecificDirectorRole(roleNames: string[]) {
  return roleNames.find((roleName) => {
    const normalizedRoleName = roleName.toLowerCase();

    return (
      normalizedRoleName.includes("director") &&
      normalizedRoleName !== "directors"
    );
  });
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function getExecutiveRoleLabel({
  roleNames,
  tagline,
}: {
  roleNames: string[];
  tagline: string | null;
}) {
  const sources = [tagline ?? "", ...roleNames].map((value) =>
    value.toLowerCase(),
  );

  if (
    sources.some(
      (value) => value.includes("vice president") || /\bvp\b/.test(value),
    )
  ) {
    return "Vice President";
  }
  if (sources.some((value) => value.includes("president"))) {
    return "President";
  }
  if (sources.some((value) => value.includes("treasurer"))) {
    return "Treasurer";
  }
  if (sources.some((value) => value.includes("secretary"))) {
    return "Secretary";
  }
  if (
    sources.some((value) => includesAny(value, ["hack lead", "hackathon lead"]))
  ) {
    return "Hack Lead";
  }
  if (
    sources.some((value) =>
      includesAny(value, ["dev lead", "development lead"]),
    )
  ) {
    return "Development Lead";
  }

  return "Executive Officer";
}

function getExecutiveSortOrder(roleLabel: string) {
  const index = TEAM.CLUB_EXECUTIVE_ROLE_ORDER.findIndex(
    (label) => label === roleLabel,
  );

  return index === -1 ? TEAM.CLUB_EXECUTIVE_ROLE_ORDER.length : index;
}

function getTeamRoleLabel({
  roleNames,
  tagline,
  team,
}: {
  roleNames: string[];
  tagline: string | null;
  team: TEAM.ClubTeamDefinition;
}) {
  if (team.slug === "executive") {
    return getExecutiveRoleLabel({ roleNames, tagline });
  }

  if (team.slug === "directors") {
    return getSpecificDirectorRole(roleNames) ?? "Director";
  }

  return team.label;
}

function sortPublicClubRoster(roster: PublicClubTeamRoster) {
  for (const team of TEAM.CLUB_TEAM_DEFINITIONS) {
    roster[team.slug].sort((first, second) => {
      if (team.slug === "executive") {
        const firstOrder = getExecutiveSortOrder(first.teamRole);
        const secondOrder = getExecutiveSortOrder(second.teamRole);

        if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      }

      return first.name.localeCompare(second.name);
    });
  }

  return roster;
}

async function getPublicClubRoster() {
  const roleFilters = TEAM.CLUB_TEAM_DEFINITIONS.flatMap((team) =>
    team.terms.map((term) => ilike(Roles.name, `%${term}%`)),
  );
  const roleWhereClause =
    roleFilters.length === 1 ? roleFilters[0] : or(...roleFilters);

  if (!roleWhereClause) return createEmptyPublicClubRoster();

  const rows = await db
    .select({
      roleName: Roles.name,
      roleColor: Roles.teamHexcodeColor,
      userId: User.id,
      displayName: User.name,
      memberId: Member.id,
      firstName: Member.firstName,
      lastName: Member.lastName,
      tagline: Member.tagline,
      guildProfilePictureUrl: Member.profilePictureUrl,
      linkedinProfileUrl: Member.linkedinProfileUrl,
    })
    .from(Roles)
    .innerJoin(Permissions, eq(Permissions.roleId, Roles.id))
    .innerJoin(User, eq(User.id, Permissions.userId))
    .innerJoin(Member, eq(Member.userId, User.id))
    .where(and(roleWhereClause, eq(Member.guildProfileVisible, true)))
    .orderBy(Roles.name, Member.firstName, Member.lastName, User.name);

  const roster = createEmptyPublicClubRoster();
  const rowsByUserId = new Map<string, typeof rows>();

  for (const row of rows) {
    rowsByUserId.set(row.userId, [
      ...(rowsByUserId.get(row.userId) ?? []),
      row,
    ]);
  }

  for (const userRows of rowsByUserId.values()) {
    const rankedRoles = userRows
      .map((row) => ({ row, team: getMatchingClubTeam(row.roleName) }))
      .filter(
        (
          entry,
        ): entry is {
          row: (typeof rows)[number];
          team: TEAM.ClubTeamDefinition;
        } => entry.team !== null,
      )
      .sort(
        (first, second) =>
          TEAM.CLUB_TEAM_DEFINITIONS.findIndex(
            (team) => team.slug === first.team.slug,
          ) -
          TEAM.CLUB_TEAM_DEFINITIONS.findIndex(
            (team) => team.slug === second.team.slug,
          ),
      );
    const primaryRole = rankedRoles[0];

    if (!primaryRole) continue;

    const roleNames = userRows.map((row) => row.roleName);
    const { row, team } = primaryRole;

    roster[team.slug].push({
      id: `${team.slug}-${row.memberId}`,
      name: getFullName({
        firstName: row.firstName,
        lastName: row.lastName,
        displayName: row.displayName,
      }),
      teamRole: getTeamRoleLabel({
        roleNames,
        tagline: row.tagline,
        team,
      }),
      imageUrl: toNonEmptyString(row.guildProfilePictureUrl),
      linkedinUrl: toNonEmptyString(row.linkedinProfileUrl),
      color: row.roleColor,
    });
  }

  return sortPublicClubRoster(roster);
}

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
        logger.error("uploadProfilePicture: Base64 data is missing.");
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
          MINIO.PROFILE_PICTURES_BUCKET_NAME,
        );
        if (!bucketExists) {
          await minioClient.makeBucket(
            MINIO.PROFILE_PICTURES_BUCKET_NAME,
            MINIO.BUCKET_REGION,
          );
        }
      } catch (e) {
        logger.error(
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
          MINIO.PROFILE_PICTURES_BUCKET_NAME,
          userDirectory,
          true,
        ) as AsyncIterable<BucketItem>;
        for await (const obj of stream) {
          if (obj.name) {
            existingObjects.push(obj.name);
          }
        }
      } catch (e) {
        logger.warn(
          "uploadProfilePicture: Error listing existing profile pictures, proceeding with upload:",
          e,
        );
      }

      if (existingObjects.length > 0) {
        try {
          await minioClient.removeObjects(
            MINIO.PROFILE_PICTURES_BUCKET_NAME,
            existingObjects,
          );
        } catch (e) {
          logger.error(
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
          MINIO.PROFILE_PICTURES_BUCKET_NAME,
          objectName,
          fileBuffer,
          fileBuffer.length,
          { "Content-Type": contentType },
        );
      } catch (e) {
        logger.error(
          "uploadProfilePicture: Error uploading profile picture to Minio:",
          e,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not upload profile picture.",
        });
      }

      const publicUrl = `https://${env.MINIO_ENDPOINT}/${MINIO.PROFILE_PICTURES_BUCKET_NAME}/${objectName}`;

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
          ? await baseQuery
              .orderBy(
                sql`(CASE WHEN ${Member.tagline}           IS NULL THEN 1 ELSE 0 END)`,
                sql`(CASE WHEN ${Member.profilePictureUrl} IS NULL OR ${Member.profilePictureUrl} = '' OR TRIM(${Member.profilePictureUrl}) = '' THEN 1 ELSE 0 END)`,
                sql`(CASE WHEN ${Member.about}             IS NULL THEN 1 ELSE 0 END)`,
                sql`RANDOM()`,
              )
              .limit(pageSize)
          : await baseQuery
              .orderBy(Member.firstName, Member.lastName, Member.id)
              .limit(pageSize)
              .offset(page * pageSize);

      const total =
        (await db.select({ count: count() }).from(Member).where(whereExpr))[0]
          ?.count ?? 0;

      return { members, total };
    }),

  getPublicClubTeamRoster: publicProcedure.query(async () => {
    return await getPublicClubRoster();
  }),

  getGuildResume: publicProcedure
    .input(z.object({ memberId: z.string().uuid() }))
    .query(async ({ input }) => {
      const member = await db.query.Member.findFirst({
        where: (t, { eq }) => eq(t.id, input.memberId),
        columns: {
          resumeUrl: true,
          userId: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!member?.resumeUrl) return { url: null };

      const resumeObjectName = normalizeOwnedResumeObjectName(
        member.resumeUrl,
        member.userId,
      );
      if (!resumeObjectName) return { url: null };

      const ext = resumeObjectName.endsWith(".pdf") ? ".pdf" : "";
      const safeName = `${member.firstName}_${member.lastName}`
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_-]/g, "");
      const downloadName = `${safeName}_Guild_Resume${ext}`;

      try {
        const url = await s3Client.presignedUrl(
          "GET",
          RESUME_BUCKET_NAME,
          resumeObjectName,
          60 * 60,
          {
            "response-content-disposition": `attachment; filename="${downloadName}"`,
          },
        );
        logger.log("Resumé URL generated:", url);
        return { url };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not generate résumé URL",
        });
      }
    }),
} satisfies TRPCRouterRecord;
