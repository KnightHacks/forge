import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import type { SQL, SQLWrapper } from "@forge/db";
import { and, asc, desc, eq, inArray, isNotNull, ne, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles } from "@forge/db/schemas/auth";
import { ClubTeamRole } from "@forge/db/schemas/club-team";
import { Company, Employment, Member } from "@forge/db/schemas/knight-hacks";
import {
  companyIdInputSchema,
  guildFilterOptionsSchema,
  guildListProfilesInputSchema,
  guildProfileInputSchema,
  guildProfileSchema,
  guildResumeUrlInputSchema,
} from "@forge/validators";

import type { GuildRoleCallout } from "../utils/guild/role-callout";
import { publicProcedure } from "../trpc";
import { getCompanyImageUrl } from "../utils/career/company-image";
import { getGlobeCity } from "../utils/career/globe-cities";
import { getUsCity } from "../utils/career/us-cities";
import { getVisiblePublicClubRoster } from "../utils/guild/club-roster";
import { loadClubTeamConfig } from "../utils/guild/club-team-config";
import {
  normalizePublicGuildText,
  normalizePublicGuildUrl,
} from "../utils/guild/public-profile";
import { getGuildRoleCallout } from "../utils/guild/role-callout";
import { graduatedCondition, hasGraduated } from "../utils/member/graduation";
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
    (CASE WHEN
      ${nonEmpty(Member.company)}
      OR EXISTS (
        SELECT 1
        FROM ${Employment} guild_employment
        INNER JOIN ${Company} guild_company
          ON guild_company.id = guild_employment.company_id
        WHERE guild_employment.member_id = ${Member.id}
          AND guild_employment.guild_visible = true
          AND guild_company.review_state = 'approved'
      )
      THEN 1 ELSE 0 END) +
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
        OR lower(coalesce(${Member.company}, '')) LIKE ${prefix}
        OR EXISTS (
          SELECT 1
          FROM ${Employment} guild_employment
          INNER JOIN ${Company} guild_company
            ON guild_company.id = guild_employment.company_id
          WHERE guild_employment.member_id = ${Member.id}
            AND guild_employment.guild_visible = true
            AND guild_company.review_state = 'approved'
            AND lower(guild_company.display_name) LIKE ${prefix}
        ) THEN 3
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
    sql`EXISTS (
      SELECT 1
      FROM ${Employment} guild_employment
      INNER JOIN ${Company} guild_company
        ON guild_company.id = guild_employment.company_id
      WHERE guild_employment.member_id = ${Member.id}
        AND guild_employment.guild_visible = true
        AND guild_company.review_state = 'approved'
        AND (
          guild_company.display_name ILIKE ${pattern}
          OR guild_company.legal_name ILIKE ${pattern}
          OR EXISTS (
            SELECT 1
            FROM unnest(guild_company.aliases) AS company_alias
            WHERE company_alias ILIKE ${pattern}
          )
        )
    )`,
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
    filters.push(graduatedCondition(false));
  } else if (wantsAlumni && !wantsCurrent) {
    filters.push(graduatedCondition(true));
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
    // "On the team" is now whatever the club roster configuration classifies,
    // matched on role ID. It used to be a literal list of role names, which
    // dropped anyone whose Discord role had since been renamed.
    filters.push(sql`
      EXISTS (
        SELECT 1
        FROM ${Permissions}
        INNER JOIN ${ClubTeamRole} ON ${ClubTeamRole.roleId} = ${Permissions.roleId}
        WHERE ${Permissions.userId} = ${Member.userId}
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

  const [config, rows] = await Promise.all([
    loadClubTeamConfig(),
    db
      .select({
        userId: Permissions.userId,
        roleId: Roles.id,
        color: Roles.teamHexcodeColor,
      })
      .from(Permissions)
      .innerJoin(Roles, eq(Roles.id, Permissions.roleId))
      .where(inArray(Permissions.userId, [...userIds])),
  ]);

  const rolesByUserId = new Map<
    string,
    { roleId: string; color: string | null }[]
  >();
  for (const row of rows) {
    const roles = rolesByUserId.get(row.userId) ?? [];
    roles.push({ roleId: row.roleId, color: row.color });
    rolesByUserId.set(row.userId, roles);
  }

  return new Map<string, GuildRoleCallout | null>(
    [...rolesByUserId].map(([userId, roles]) => [
      userId,
      getGuildRoleCallout(config, roles),
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
  currentCompany?: string | null,
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
    company: currentCompany ?? row.company,
    githubProfileUrl: normalizePublicGuildUrl(row.githubProfileUrl),
    linkedinProfileUrl: normalizePublicGuildUrl(row.linkedinProfileUrl),
    websiteUrl: normalizePublicGuildUrl(row.websiteUrl),
    resumeAvailable:
      row.guildResumeVisible &&
      typeof row.resumeReference === "string" &&
      row.resumeReference.trim().length > 0,
    opportunityStatuses: row.opportunityStatuses,
    memberStatus: hasGraduated(row.gradDate) ? "alumni" : "current",
    roleCallout,
  });
}

async function getCurrentCompanyNames(memberIds: readonly string[]) {
  if (memberIds.length === 0) return new Map<string, string>();
  const rows = await db
    .select({
      companyName: Company.displayName,
      memberId: Employment.memberId,
      startMonth: Employment.startMonth,
    })
    .from(Employment)
    .innerJoin(Company, eq(Company.id, Employment.companyId))
    .where(
      and(
        inArray(Employment.memberId, [...memberIds]),
        eq(Employment.state, "current"),
        eq(Employment.guildVisible, true),
        eq(Company.reviewState, "approved"),
      ),
    )
    .orderBy(desc(Employment.startMonth), asc(Company.displayName));
  const companyByMember = new Map<string, string>();
  for (const row of rows) {
    if (!companyByMember.has(row.memberId)) {
      companyByMember.set(row.memberId, row.companyName);
    }
  }
  return companyByMember;
}

export const guildRouter = {
  listPublicCompanies: publicProcedure.query(async () => {
    const companies = await db
      .select({
        currentMembers: sql<number>`count(DISTINCT ${Employment.memberId}) FILTER (WHERE ${Employment.state} = 'current')::int`,
        displayName: Company.displayName,
        domain: Company.domain,
        formerMembers: sql<number>`count(DISTINCT ${Employment.memberId}) FILTER (WHERE ${Employment.state} = 'past')::int`,
        id: Company.id,
        logoObjectName: Company.logoObjectName,
        unconfirmedMembers: sql<number>`count(DISTINCT ${Employment.memberId}) FILTER (WHERE ${Employment.state} = 'unknown')::int`,
      })
      .from(Company)
      .innerJoin(Employment, eq(Employment.companyId, Company.id))
      .innerJoin(Member, eq(Member.id, Employment.memberId))
      .where(
        and(
          eq(Company.reviewState, "approved"),
          eq(Employment.guildVisible, true),
          eq(Member.guildProfileVisible, true),
        ),
      )
      .groupBy(Company.id)
      .orderBy(
        desc(sql`count(DISTINCT ${Employment.memberId})`),
        asc(Company.displayName),
      );

    return await Promise.all(
      companies.map(async ({ logoObjectName, ...company }) => ({
        ...company,
        logoUrl: await getCompanyImageUrl(company.id, logoObjectName),
      })),
    );
  }),

  getPublicCompany: publicProcedure
    .input(companyIdInputSchema)
    .query(async ({ input }) => {
      const company = await db.query.Company.findFirst({
        where: and(
          eq(Company.id, input.companyId),
          eq(Company.reviewState, "approved"),
        ),
        columns: {
          displayName: true,
          domain: true,
          id: true,
          legalName: true,
          logoObjectName: true,
        },
      });
      if (!company) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Company not found.",
        });
      }

      const rows = await db
        .select({
          ...publicMemberColumns,
          cityKey: Employment.cityKey,
          employmentId: Employment.id,
          endMonth: Employment.endMonth,
          experienceType: Employment.experienceType,
          startMonth: Employment.startMonth,
          state: Employment.state,
          title: Employment.title,
        })
        .from(Employment)
        .innerJoin(Member, eq(Member.id, Employment.memberId))
        .where(
          and(
            eq(Employment.companyId, company.id),
            eq(Employment.guildVisible, true),
            eq(Member.guildProfileVisible, true),
          ),
        )
        .orderBy(
          asc(
            sql<number>`CASE ${Employment.state} WHEN 'current' THEN 0 WHEN 'past' THEN 1 ELSE 2 END`,
          ),
          asc(Member.firstName),
          asc(Member.lastName),
        );
      const callouts = await getRoleCalloutsByUserId(
        rows.map((row) => row.userId),
      );
      const currentCompanies = await getCurrentCompanyNames(
        rows.map((row) => row.id),
      );
      const relationships = await Promise.all(
        rows.map(async (row) => ({
          city: row.cityKey ? getUsCity(row.cityKey) : null,
          employmentId: row.employmentId,
          endMonth: row.endMonth,
          experienceType: row.experienceType,
          profile: await toPublicProfile(
            row,
            callouts.get(row.userId) ?? null,
            currentCompanies.get(row.id),
          ),
          startMonth: row.startMonth,
          state: row.state,
          title: row.title,
        })),
      );
      const { logoObjectName, ...publicCompany } = company;
      return {
        company: {
          ...publicCompany,
          logoUrl: await getCompanyImageUrl(company.id, logoObjectName),
        },
        relationships,
      };
    }),

  getPublicGlobeLocations: publicProcedure.query(async () => {
    const rows = await db
      .select({
        ...publicMemberColumns,
        currentCityKey: Member.currentCityKey,
      })
      .from(Member)
      .where(
        and(
          eq(Member.guildProfileVisible, true),
          eq(Member.guildLocationVisible, true),
          isNotNull(Member.currentCityKey),
        ),
      )
      .orderBy(asc(Member.firstName), asc(Member.lastName));
    const callouts = await getRoleCalloutsByUserId(
      rows.map((row) => row.userId),
    );
    const currentCompanies = await getCurrentCompanyNames(
      rows.map((row) => row.id),
    );
    const grouped = new Map<
      string,
      {
        city: NonNullable<ReturnType<typeof getGlobeCity>>;
        profiles: Awaited<ReturnType<typeof toPublicProfile>>[];
      }
    >();
    for (const row of rows) {
      if (!row.currentCityKey) continue;
      const city = getGlobeCity(row.currentCityKey);
      if (!city) continue;
      const group = grouped.get(city.key) ?? { city, profiles: [] };
      group.profiles.push(
        await toPublicProfile(
          row,
          callouts.get(row.userId) ?? null,
          currentCompanies.get(row.id),
        ),
      );
      grouped.set(city.key, group);
    }
    return [...grouped.values()]
      .map((group) => ({
        ...group.city,
        count: group.profiles.length,
        profiles: group.profiles,
      }))
      .sort(
        (first, second) =>
          second.count - first.count || first.label.localeCompare(second.label),
      );
  }),

  getPublicClubTeamRoster: publicProcedure.query(async () => {
    return await getVisiblePublicClubRoster();
  }),

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
      const currentCompanies = await getCurrentCompanyNames(
        pageRows.map((row) => row.id),
      );
      const profiles = await Promise.all(
        pageRows.map((row) =>
          toPublicProfile(
            row,
            callouts.get(row.userId) ?? null,
            currentCompanies.get(row.id),
          ),
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

      const employment = await db
        .select({
          cityKey: Employment.cityKey,
          companyDisplayName: Company.displayName,
          companyId: Company.id,
          endMonth: Employment.endMonth,
          experienceType: Employment.experienceType,
          id: Employment.id,
          startMonth: Employment.startMonth,
          state: Employment.state,
          title: Employment.title,
        })
        .from(Employment)
        .innerJoin(Company, eq(Company.id, Employment.companyId))
        .where(
          and(
            eq(Employment.memberId, row.id),
            eq(Employment.guildVisible, true),
            eq(Company.reviewState, "approved"),
          ),
        )
        .orderBy(
          asc(
            sql<number>`CASE ${Employment.state} WHEN 'current' THEN 0 WHEN 'past' THEN 1 ELSE 2 END`,
          ),
          desc(Employment.startMonth),
        );
      const callouts = await getRoleCalloutsByUserId([row.userId]);
      const profile = await toPublicProfile(
        row,
        callouts.get(row.userId) ?? null,
        employment.find((item) => item.state === "current")?.companyDisplayName,
      );

      return guildProfileSchema.parse({
        ...profile,
        employmentHistory: employment.map((item) => ({
          city: item.cityKey ? getUsCity(item.cityKey) : null,
          company: {
            displayName: item.companyDisplayName,
            id: item.companyId,
          },
          endMonth: item.endMonth,
          experienceType: item.experienceType,
          id: item.id,
          startMonth: item.startMonth,
          state: item.state,
          title: item.title,
        })),
      });
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
