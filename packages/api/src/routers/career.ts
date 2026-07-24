import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { SQL } from "@forge/db";
import { CAREER } from "@forge/consts";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Company, Employment, Member } from "@forge/db/schemas/knight-hacks";
import { permissions } from "@forge/utils";
import {
  companyAdminUpdateSchema,
  companyCreateInputSchema,
  companyIdInputSchema,
  companySearchInputSchema,
  employmentHistorySchema,
  guildLocationInputSchema,
  mergeCompaniesInputSchema,
  normalizeCompanyName,
  usCitySearchInputSchema,
} from "@forge/validators";

import { permProcedure, protectedProcedure } from "../trpc";
import { replaceEmploymentHistory } from "../utils/career/employment";
import {
  getUsCity,
  hasUsCity,
  searchUsCities,
} from "../utils/career/us-cities";

const readMemberPermissions = ["READ_MEMBERS", "EDIT_MEMBERS"] as const;
const editMemberPermissions = ["EDIT_MEMBERS"] as const;

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "23505") return true;
  return (
    "cause" in error &&
    typeof error.cause === "object" &&
    error.cause !== null &&
    isUniqueViolation(error.cause)
  );
}

function assertCanReadMembers(
  ctx: Parameters<typeof permissions.controlPerms.or>[1],
) {
  permissions.controlPerms.or(readMemberPermissions, ctx);
}

function assertCanEditMembers(
  ctx: Parameters<typeof permissions.controlPerms.or>[1],
) {
  permissions.controlPerms.or(editMemberPermissions, ctx);
}

async function getMemberForUser(userId: string) {
  const member = await db.query.Member.findFirst({
    where: eq(Member.userId, userId),
    columns: {
      currentCityKey: true,
      guildLocationVisible: true,
      id: true,
    },
  });

  if (!member) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Create a member profile before editing career history.",
    });
  }

  return member;
}

function assertKnownCityKeys(cityKeys: readonly (string | null)[]) {
  const invalid = cityKeys.find((key) => key && !hasUsCity(key));
  if (invalid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Choose a city from the U.S. city search.",
    });
  }
}

function companySearchCondition(query: string): SQL | undefined {
  const pattern = `%${query}%`;
  return or(
    ilike(Company.displayName, pattern),
    ilike(Company.legalName, pattern),
    ilike(Company.domain, pattern),
    sql`EXISTS (
      SELECT 1
      FROM unnest(${Company.aliases}) AS company_alias
      WHERE company_alias ILIKE ${pattern}
    )`,
  );
}

function publicOrCreatedBy(userId: string): SQL | undefined {
  return or(
    eq(Company.reviewState, "approved"),
    eq(Company.createdByUserId, userId),
  );
}

export const careerRouter = {
  searchCompanies: protectedProcedure
    .input(companySearchInputSchema)
    .query(async ({ ctx, input }) => {
      return await db
        .select({
          aliases: Company.aliases,
          displayName: Company.displayName,
          domain: Company.domain,
          id: Company.id,
          reviewState: Company.reviewState,
        })
        .from(Company)
        .where(
          and(
            publicOrCreatedBy(ctx.session.user.id),
            companySearchCondition(input.query),
          ),
        )
        .orderBy(
          asc(
            sql<number>`CASE WHEN lower(${Company.displayName}) = lower(${input.query}) THEN 0 ELSE 1 END`,
          ),
          asc(Company.displayName),
        )
        .limit(input.limit);
    }),

  createCompany: protectedProcedure
    .input(companyCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const normalizedDisplayName = normalizeCompanyName(input.displayName);
      const existing = await db.query.Company.findFirst({
        where: eq(Company.normalizedDisplayName, normalizedDisplayName),
      });

      if (
        existing?.reviewState === "approved" ||
        existing?.createdByUserId === ctx.session.user.id
      ) {
        return existing;
      }
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That company already exists or is awaiting officer review.",
        });
      }

      try {
        const [company] = await db
          .insert(Company)
          .values({
            createdByUserId: ctx.session.user.id,
            displayName: input.displayName,
            normalizedDisplayName,
            reviewState: "pending",
          })
          .returning();

        if (!company) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Company could not be created.",
          });
        }

        return company;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        if (isUniqueViolation(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "That company already exists or is awaiting officer review.",
          });
        }
        throw error;
      }
    }),

  listMyEmployment: protectedProcedure.query(async ({ ctx }) => {
    const member = await getMemberForUser(ctx.session.user.id);
    const employment = await db
      .select({
        cityKey: Employment.cityKey,
        company: {
          displayName: Company.displayName,
          id: Company.id,
          reviewState: Company.reviewState,
        },
        createdAt: Employment.createdAt,
        endMonth: Employment.endMonth,
        experienceType: Employment.experienceType,
        guildVisible: Employment.guildVisible,
        id: Employment.id,
        startMonth: Employment.startMonth,
        state: Employment.state,
        title: Employment.title,
        updatedAt: Employment.updatedAt,
      })
      .from(Employment)
      .innerJoin(Company, eq(Company.id, Employment.companyId))
      .where(eq(Employment.memberId, member.id))
      .orderBy(
        asc(
          sql<number>`CASE ${Employment.state} WHEN 'current' THEN 0 WHEN 'past' THEN 1 ELSE 2 END`,
        ),
        desc(Employment.startMonth),
        asc(Company.displayName),
      );
    return {
      currentLocation: {
        city: member.currentCityKey ? getUsCity(member.currentCityKey) : null,
        currentCityKey: member.currentCityKey,
        guildLocationVisible: member.guildLocationVisible,
      },
      employment: employment.map((row) => ({
        ...row,
        city: row.cityKey ? getUsCity(row.cityKey) : null,
      })),
    };
  }),

  replaceMyEmploymentHistory: protectedProcedure
    .input(employmentHistorySchema)
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberForUser(ctx.session.user.id);

      return await db.transaction(
        async (tx) =>
          await replaceEmploymentHistory({
            database: tx,
            employmentHistory: input,
            memberId: member.id,
            userId: ctx.session.user.id,
          }),
      );
    }),

  updateMyCurrentCity: protectedProcedure
    .input(guildLocationInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertKnownCityKeys([input.currentCityKey]);
      const [member] = await db
        .update(Member)
        .set(input)
        .where(eq(Member.userId, ctx.session.user.id))
        .returning({
          currentCityKey: Member.currentCityKey,
          guildLocationVisible: Member.guildLocationVisible,
        });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Create a member profile before setting a current city.",
        });
      }

      return {
        ...member,
        city: member.currentCityKey ? getUsCity(member.currentCityKey) : null,
      };
    }),

  searchUsCities: protectedProcedure
    .input(usCitySearchInputSchema)
    .query(({ input }) => searchUsCities(input.query, input.limit)),

  listAdminCompanies: permProcedure.query(async ({ ctx }) => {
    assertCanReadMembers(ctx);
    return await db
      .select({
        aliases: Company.aliases,
        cities: sql<
          string[]
        >`coalesce(array_remove(array_agg(DISTINCT ${Employment.cityKey}), NULL), ARRAY[]::varchar[])`,
        currentMembers: sql<number>`count(DISTINCT ${Employment.memberId}) FILTER (WHERE ${Employment.state} = 'current')::int`,
        displayName: Company.displayName,
        domain: Company.domain,
        experienceTypes: sql<
          string[]
        >`coalesce(array_remove(array_agg(DISTINCT ${Employment.experienceType}), NULL), ARRAY[]::employment_experience_type[])`,
        formerMembers: sql<number>`count(DISTINCT ${Employment.memberId}) FILTER (WHERE ${Employment.state} = 'past')::int`,
        id: Company.id,
        legalName: Company.legalName,
        reviewState: Company.reviewState,
        unconfirmedMembers: sql<number>`count(DISTINCT ${Employment.memberId}) FILTER (WHERE ${Employment.state} = 'unknown')::int`,
        updatedAt: Company.updatedAt,
      })
      .from(Company)
      .leftJoin(Employment, eq(Employment.companyId, Company.id))
      .groupBy(Company.id)
      .orderBy(
        asc(
          sql<number>`CASE ${Company.reviewState} WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 WHEN 'rejected' THEN 2 ELSE 3 END`,
        ),
        asc(Company.displayName),
      );
  }),

  getAdminCompany: permProcedure
    .input(companyIdInputSchema)
    .query(async ({ ctx, input }) => {
      assertCanReadMembers(ctx);
      const company = await db.query.Company.findFirst({
        where: eq(Company.id, input.companyId),
      });
      if (!company) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Company not found.",
        });
      }

      const employment = await db
        .select({
          cityKey: Employment.cityKey,
          endMonth: Employment.endMonth,
          experienceType: Employment.experienceType,
          firstName: Member.firstName,
          guildVisible: Employment.guildVisible,
          id: Employment.id,
          lastName: Member.lastName,
          memberId: Member.id,
          startMonth: Employment.startMonth,
          state: Employment.state,
          title: Employment.title,
        })
        .from(Employment)
        .innerJoin(Member, eq(Member.id, Employment.memberId))
        .where(eq(Employment.companyId, company.id))
        .orderBy(
          asc(
            sql<number>`CASE ${Employment.state} WHEN 'current' THEN 0 WHEN 'past' THEN 1 ELSE 2 END`,
          ),
          asc(Member.firstName),
          asc(Member.lastName),
        );

      return {
        company,
        employment: employment.map((row) => ({
          ...row,
          city: row.cityKey ? getUsCity(row.cityKey) : null,
        })),
      };
    }),

  updateCompany: permProcedure
    .input(z.intersection(companyIdInputSchema, companyAdminUpdateSchema))
    .mutation(async ({ ctx, input }) => {
      assertCanEditMembers(ctx);
      const { companyId, ...metadata } = input;
      let company: typeof Company.$inferSelect | undefined;
      try {
        [company] = await db
          .update(Company)
          .set({
            ...metadata,
            normalizedDisplayName: normalizeCompanyName(metadata.displayName),
            updatedAt: new Date(),
          })
          .where(eq(Company.id, companyId))
          .returning();
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Another company already uses that canonical display name. Merge the records instead.",
          });
        }
        throw error;
      }

      if (!company) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Company not found.",
        });
      }
      return company;
    }),

  approveCompany: permProcedure
    .input(companyIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanEditMembers(ctx);
      const [company] = await db
        .update(Company)
        .set({ reviewState: "approved", updatedAt: new Date() })
        .where(
          and(
            eq(Company.id, input.companyId),
            inArray(Company.reviewState, ["pending", "rejected"]),
          ),
        )
        .returning();
      if (!company) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending or rejected companies can be approved.",
        });
      }
      return company;
    }),

  rejectCompany: permProcedure
    .input(companyIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanEditMembers(ctx);
      const [company] = await db
        .update(Company)
        .set({ reviewState: "rejected", updatedAt: new Date() })
        .where(
          and(
            eq(Company.id, input.companyId),
            inArray(Company.reviewState, ["pending", "approved"]),
          ),
        )
        .returning();
      if (!company) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending or approved companies can be rejected.",
        });
      }
      return company;
    }),

  mergeCompanies: permProcedure
    .input(mergeCompaniesInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanEditMembers(ctx);

      return await db.transaction(async (tx) => {
        const [canonical, duplicate] = await Promise.all([
          tx.query.Company.findFirst({
            where: eq(Company.id, input.canonicalCompanyId),
          }),
          tx.query.Company.findFirst({
            where: eq(Company.id, input.duplicateCompanyId),
          }),
        ]);

        if (!canonical || !duplicate) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "One or both companies could not be found.",
          });
        }
        if (
          canonical.reviewState === "merged" ||
          canonical.reviewState === "rejected" ||
          duplicate.reviewState === "merged"
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Choose active companies to merge.",
          });
        }

        const aliasCandidates = [
          ...canonical.aliases,
          duplicate.displayName,
          ...(duplicate.legalName ? [duplicate.legalName] : []),
          ...duplicate.aliases,
        ];
        const seen = new Set([canonical.normalizedDisplayName]);
        const aliases = aliasCandidates
          .filter((alias) => {
            const normalized = normalizeCompanyName(alias);
            if (!normalized || seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
          })
          .slice(0, CAREER.MAX_COMPANY_ALIASES);

        await tx
          .update(Employment)
          .set({
            companyId: canonical.id,
            updatedAt: new Date(),
          })
          .where(eq(Employment.companyId, duplicate.id));
        const [updatedCanonical] = await tx
          .update(Company)
          .set({ aliases, updatedAt: new Date() })
          .where(eq(Company.id, canonical.id))
          .returning();
        await tx
          .update(Company)
          .set({
            mergedIntoCompanyId: canonical.id,
            reviewState: "merged",
            updatedAt: new Date(),
          })
          .where(eq(Company.id, duplicate.id));

        return updatedCanonical;
      });
    }),
} satisfies TRPCRouterRecord;
