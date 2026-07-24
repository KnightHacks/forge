import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import type { SQL, SQLWrapper } from "@forge/db";
import { TEAM } from "@forge/consts";
import { and, asc, desc, eq, inArray, isNotNull, ne, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles } from "@forge/db/schemas/auth";
import { Member } from "@forge/db/schemas/knight-hacks";
import {
  guildFilterOptionsSchema,
  guildListProfilesInputSchema,
  guildProfileInputSchema,
  guildProfileSchema,
  guildResumeUrlInputSchema,
} from "@forge/validators";

import type { GuildRoleCallout } from "../utils/guild/role-callout";
import { publicProcedure } from "../trpc";
import {
  normalizePublicGuildText,
  normalizePublicGuildUrl,
} from "../utils/guild/public-profile";
import { getGuildRoleCallout } from "../utils/guild/role-callout";
import {
  PROFILE_PICTURE_BUCKET_NAME,
  resolveProfilePictureObjectName,
} from "../utils/profile-picture/security";
import { profilePictureStorageClient } from "../utils/profile-picture/storage";
import {
  normalizeOwnedResumeObjectName,
  RESUME_BUCKET_NAME,
} from "../utils/resume/security";
import { resumeStorageClient } from "../utils/resume/storage";

const publicMemberColumns = {
  id: Member.id,
  userId: Member.userId,
  firstName: Member.firstName,
  lastName: Member.lastName,
  tagline: Member.tagline,
  about: Member.about,
  profilePictureReference: Member.profilePictureUrl,
  school: Member.school,
  major: Member.major,
  gradDate: Member.gradDate,
  memberSinceDate: Member.dateCreated,
  company: Member.company,
  githubProfileUrl: Member.githubProfileUrl,
  linkedinProfileUrl: Member.linkedinProfileUrl,
  websiteUrl: Member.websiteUrl,
  resumeReference: Member.resumeUrl,
  guildResumeVisible: Member.guildResumeVisible,
  opportunityStatuses: Member.guildOpportunityStatuses,
} as const;

type PublicMemberRow = Awaited<
  ReturnType<ReturnType<typeof db.select<typeof publicMemberColumns>>["from"]>
>[number];

interface GuildCursor {
  offset: number;
  seed: string;
}

function encodeCursor(cursor: GuildCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(cursor: string | undefined, seed: string) {
  if (!cursor) return 0;

  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as Partial<GuildCursor>;

    if (
      decoded.seed !== seed ||
      typeof decoded.offset !== "number" ||
      !Number.isSafeInteger(decoded.offset) ||
      decoded.offset < 0
    ) {
      throw new Error("invalid cursor");
    }

    return decoded.offset;
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The Guild cursor is invalid or expired.",
    });
  }
}

function nonEmpty(column: SQLWrapper) {
  return and(isNotNull(column), ne(sql`trim(${column})`, ""));
}

function getCompletenessOrder() {
  return sql<number>`
    (CASE WHEN ${nonEmpty(Member.profilePictureUrl)} THEN 1 ELSE 0 END) +
    (CASE WHEN ${nonEmpty(Member.tagline)} THEN 1 ELSE 0 END) +
    (CASE WHEN ${nonEmpty(Member.about)} THEN 1 ELSE 0 END) +
    (CASE WHEN ${nonEmpty(Member.company)} THEN 1 ELSE 0 END) +
    (CASE WHEN
      ${nonEmpty(Member.githubProfileUrl)}
      OR ${nonEmpty(Member.linkedinProfileUrl)}
      OR ${nonEmpty(Member.websiteUrl)}
      THEN 1 ELSE 0 END)
  `;
}

function opportunitySearchText() {
  return sql<string>`
    concat_ws(' ',
      CASE WHEN 'internships' = ANY(${Member.guildOpportunityStatuses}) THEN 'Open to internships' END,
      CASE WHEN 'full-time' = ANY(${Member.guildOpportunityStatuses}) THEN 'Open to full-time roles' END,
      CASE WHEN 'freelance-contract' = ANY(${Member.guildOpportunityStatuses}) THEN 'Open to freelance contract work' END,
      CASE WHEN 'project-collaboration' = ANY(${Member.guildOpportunityStatuses}) THEN 'Open to project collaboration' END,
      CASE WHEN 'offering-mentorship' = ANY(${Member.guildOpportunityStatuses}) THEN 'Offering mentorship' END,
      CASE WHEN 'seeking-mentorship' = ANY(${Member.guildOpportunityStatuses}) THEN 'Seeking mentorship' END
    )
  `;
}

function getSearchRank(query: string) {
  const normalized = query.toLowerCase();
  const prefix = `${normalized}%`;
  const contains = `%${normalized}%`;
  const fullName = sql<string>`lower(concat_ws(' ', ${Member.firstName}, ${Member.lastName}))`;

  return sql<number>`
    CASE
      WHEN ${fullName} = ${normalized} THEN 0
      WHEN lower(${Member.firstName}) = ${normalized}
        OR lower(${Member.lastName}) = ${normalized} THEN 1
      WHEN ${fullName} LIKE ${prefix}
        OR lower(${Member.firstName}) LIKE ${prefix}
        OR lower(${Member.lastName}) LIKE ${prefix} THEN 2
      WHEN lower(coalesce(${Member.tagline}, '')) LIKE ${prefix}
        OR lower(coalesce(${Member.company}, '')) LIKE ${prefix} THEN 3
      WHEN ${fullName} LIKE ${contains} THEN 4
      ELSE 5
    END
  `;
}

function getSearchFilter(query: string) {
  const pattern = `%${query}%`;
  return or(
    sql`concat_ws(' ', ${Member.firstName}, ${Member.lastName}) ILIKE ${pattern}`,
    sql`${Member.tagline} ILIKE ${pattern}`,
    sql`${Member.about} ILIKE ${pattern}`,
    sql`${Member.school} ILIKE ${pattern}`,
    sql`${Member.major} ILIKE ${pattern}`,
    sql`${Member.company} ILIKE ${pattern}`,
    sql`${opportunitySearchText()} ILIKE ${pattern}`,
  );
}

function getFilters(
  input: ReturnType<typeof guildListProfilesInputSchema.parse>,
) {
  const filters: SQL[] = [eq(Member.guildProfileVisible, true)];

  if (input.query) {
    const searchFilter = getSearchFilter(input.query);
    if (searchFilter) filters.push(searchFilter);
  }

  const wantsCurrent = input.memberStatuses.includes("current");
  const wantsAlumni = input.memberStatuses.includes("alumni");
  if (wantsCurrent && !wantsAlumni) {
    filters.push(sql`${Member.gradDate} >= CURRENT_DATE`);
  } else if (wantsAlumni && !wantsCurrent) {
    filters.push(sql`${Member.gradDate} < CURRENT_DATE`);
  }

  if (input.graduationYears.length > 0) {
    filters.push(
      inArray(
        sql<number>`extract(year from ${Member.gradDate})`,
        input.graduationYears,
      ),
    );
  }
  if (input.memberSinceYears.length > 0) {
    filters.push(
      inArray(
        sql<number>`extract(year from ${Member.dateCreated})`,
        input.memberSinceYears,
      ),
    );
  }
  if (input.schools.length > 0) {
    filters.push(inArray(Member.school, input.schools));
  }
  if (input.majors.length > 0) {
    filters.push(inArray(Member.major, input.majors));
  }
  if (input.resumeAvailable === true) {
    const resumeFilter = and(
      eq(Member.guildResumeVisible, true),
      isNotNull(Member.resumeUrl),
      ne(sql`trim(${Member.resumeUrl})`, ""),
    );
    if (resumeFilter) filters.push(resumeFilter);
  } else if (input.resumeAvailable === false) {
    filters.push(
      sql`NOT (${Member.guildResumeVisible} = TRUE AND ${Member.resumeUrl} IS NOT NULL AND trim(${Member.resumeUrl}) <> '')`,
    );
  }
  if (input.opportunityStatuses.length > 0) {
    const values = sql.join(
      input.opportunityStatuses.map((status) => sql`${status}`),
      sql`, `,
    );
    filters.push(
      sql`${Member.guildOpportunityStatuses} && ARRAY[${values}]::text[]`,
    );
  }
  if (input.teamMembersOnly) {
    const roleNames = sql.join(
      TEAM.CLUB_ROSTER_ROLE_NAMES.map((roleName) => sql`${roleName}`),
      sql`, `,
    );
    filters.push(sql`
      EXISTS (
        SELECT 1
        FROM ${Permissions}
        INNER JOIN ${Roles} ON ${Roles.id} = ${Permissions.roleId}
        WHERE ${Permissions.userId} = ${Member.userId}
          AND ${Roles.name} IN (${roleNames})
      )
    `);
  }

  return filters;
}

async function getRoleCalloutsByUserId(
  userIds: readonly string[],
): Promise<Map<string, GuildRoleCallout | null>> {
  if (userIds.length === 0) {
    return new Map<string, GuildRoleCallout | null>();
  }

  const rows = await db
    .select({
      userId: Permissions.userId,
      name: Roles.name,
      color: Roles.teamHexcodeColor,
    })
    .from(Permissions)
    .innerJoin(Roles, eq(Roles.id, Permissions.roleId))
    .where(inArray(Permissions.userId, [...userIds]));

  const rolesByUserId = new Map<
    string,
    { name: string; color: string | null }[]
  >();
  for (const row of rows) {
    const roles = rolesByUserId.get(row.userId) ?? [];
    roles.push({ name: row.name, color: row.color });
    rolesByUserId.set(row.userId, roles);
  }

  return new Map<string, GuildRoleCallout | null>(
    [...rolesByUserId].map(([userId, roles]) => [
      userId,
      getGuildRoleCallout(roles),
    ]),
  );
}

async function getPublicProfilePictureUrl(row: PublicMemberRow) {
  if (!row.profilePictureReference) return null;

  const objectName = resolveProfilePictureObjectName(
    row.profilePictureReference,
    row.userId,
  );
  if (!objectName) return null;

  try {
    return await profilePictureStorageClient.presignedUrl(
      "GET",
      PROFILE_PICTURE_BUCKET_NAME,
      objectName,
      60 * 60,
    );
  } catch {
    return null;
  }
}

async function toPublicProfile(
  row: PublicMemberRow,
  roleCallout: ReturnType<typeof getGuildRoleCallout>,
) {
  return guildProfileSchema.parse({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    tagline: normalizePublicGuildText(row.tagline),
    about: row.about,
    profilePictureUrl: await getPublicProfilePictureUrl(row),
    school: row.school,
    major: row.major,
    gradDate: row.gradDate,
    memberSinceDate: row.memberSinceDate,
    company: row.company,
    githubProfileUrl: normalizePublicGuildUrl(row.githubProfileUrl),
    linkedinProfileUrl: normalizePublicGuildUrl(row.linkedinProfileUrl),
    websiteUrl: normalizePublicGuildUrl(row.websiteUrl),
    resumeAvailable:
      row.guildResumeVisible &&
      typeof row.resumeReference === "string" &&
      row.resumeReference.trim().length > 0,
    opportunityStatuses: row.opportunityStatuses,
    memberStatus:
      new Date(`${row.gradDate}T23:59:59Z`) >= new Date()
        ? "current"
        : "alumni",
    roleCallout,
  });
}

export const guildRouter = {
  listProfiles: publicProcedure
    .input(guildListProfilesInputSchema)
    .query(async ({ input }) => {
      const offset = decodeCursor(input.cursor, input.seed);
      const filters = getFilters(input);
      const query = db
        .select(publicMemberColumns)
        .from(Member)
        .where(and(...filters));

      const rows = input.query
        ? await query
            .orderBy(
              asc(getSearchRank(input.query)),
              asc(Member.firstName),
              asc(Member.lastName),
              asc(Member.id),
            )
            .limit(input.limit + 1)
            .offset(offset)
        : await query
            .orderBy(
              desc(getCompletenessOrder()),
              asc(sql`md5(${Member.id}::text || ${input.seed})`),
              asc(Member.id),
            )
            .limit(input.limit + 1)
            .offset(offset);

      const pageRows = rows.slice(0, input.limit);
      const callouts = await getRoleCalloutsByUserId(
        pageRows.map((row) => row.userId),
      );
      const profiles = await Promise.all(
        pageRows.map((row) =>
          toPublicProfile(row, callouts.get(row.userId) ?? null),
        ),
      );

      return {
        profiles,
        nextCursor:
          rows.length > input.limit
            ? encodeCursor({ offset: offset + input.limit, seed: input.seed })
            : null,
      };
    }),

  getProfile: publicProcedure
    .input(guildProfileInputSchema)
    .query(async ({ input }) => {
      const [row] = await db
        .select(publicMemberColumns)
        .from(Member)
        .where(
          and(
            eq(Member.id, input.memberId),
            eq(Member.guildProfileVisible, true),
          ),
        )
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Guild profile not found.",
        });
      }

      const callouts = await getRoleCalloutsByUserId([row.userId]);
      return await toPublicProfile(row, callouts.get(row.userId) ?? null);
    }),

  getResumeUrl: publicProcedure
    .input(guildResumeUrlInputSchema)
    .query(async ({ input }) => {
      const member = await db.query.Member.findFirst({
        where: and(
          eq(Member.id, input.memberId),
          eq(Member.guildProfileVisible, true),
          eq(Member.guildResumeVisible, true),
        ),
        columns: {
          firstName: true,
          lastName: true,
          resumeUrl: true,
          userId: true,
        },
      });

      if (!member?.resumeUrl) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Guild profile or resume not found.",
        });
      }

      let objectName: string | null;
      try {
        objectName = normalizeOwnedResumeObjectName(
          member.resumeUrl,
          member.userId,
        );
      } catch {
        objectName = null;
      }
      if (!objectName) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Guild profile or resume not found.",
        });
      }

      const safeName = `${member.firstName}-${member.lastName}-resume`
        .replace(/[^a-z0-9-]/gi, "-")
        .replace(/-+/g, "-");
      const disposition =
        input.disposition === "attachment" ? "attachment" : "inline";

      try {
        return {
          url: await resumeStorageClient.presignedGetObject(
            RESUME_BUCKET_NAME,
            objectName,
            10 * 60,
            {
              "response-content-disposition": `${disposition}; filename="${safeName}.pdf"`,
              "response-content-type": "application/pdf",
            },
          ),
        };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not generate resume URL.",
        });
      }
    }),

  getFilterOptions: publicProcedure.query(async () => {
    const rows = await db
      .select({
        graduationYear: sql<number>`extract(year from ${Member.gradDate})::int`,
        memberSinceYear: sql<number>`extract(year from ${Member.dateCreated})::int`,
        school: Member.school,
        major: Member.major,
      })
      .from(Member)
      .where(eq(Member.guildProfileVisible, true));

    return guildFilterOptionsSchema.parse({
      graduationYears: [...new Set(rows.map((row) => row.graduationYear))].sort(
        (first, second) => first - second,
      ),
      memberSinceYears: [
        ...new Set(rows.map((row) => row.memberSinceYear)),
      ].sort((first, second) => first - second),
      schools: [...new Set(rows.map((row) => row.school))].sort(),
      majors: [...new Set(rows.map((row) => row.major))].sort(),
    });
  }),

  getSitemapProfiles: publicProcedure.query(async () => {
    return await db
      .select({
        id: Member.id,
        firstName: Member.firstName,
        lastName: Member.lastName,
      })
      .from(Member)
      .where(eq(Member.guildProfileVisible, true))
      .orderBy(asc(Member.id));
  }),
} satisfies TRPCRouterRecord;
