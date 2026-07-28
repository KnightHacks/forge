import { randomUUID } from "node:crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { SQL } from "@forge/db";
import { CAREER } from "@forge/consts";
import { and, asc, desc, eq, ilike, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Company, Employment, Member } from "@forge/db/schemas/knight-hacks";
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
import {
  appendAdminAuditResults,
  createAdminAuditEvent,
} from "../utils/audit/service";
import {
  getCompanyImageUrl,
  removeCompanyImage,
  uploadCompanyImage as uploadCompanyImageObject,
} from "../utils/career/company-image";
import { replaceEmploymentHistory } from "../utils/career/employment";
import {
  getUsCity,
  hasUsCity,
  searchUsCities,
} from "../utils/career/us-cities";
import { isUniqueViolation } from "../utils/db";
import {
  assertCanEditMembers,
  assertCanReadMembers,
} from "../utils/member/access";
import { MAX_PROFILE_PICTURE_DATA_URL_LENGTH } from "../utils/profile-picture/security";

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
    const companies = await db
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
        logoObjectName: Company.logoObjectName,
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

    return await Promise.all(
      companies.map(async (company) => ({
        ...company,
        logoUrl: await getCompanyImageUrl(company.id, company.logoObjectName),
      })),
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
        company: {
          ...company,
          logoUrl: await getCompanyImageUrl(company.id, company.logoObjectName),
        },
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
        company = await db.transaction(async (tx) => {
          const [before] = await tx
            .select()
            .from(Company)
            .where(eq(Company.id, companyId))
            .for("update");
          if (!before) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Company not found.",
            });
          }
          const [updated] = await tx
            .update(Company)
            .set({
              ...metadata,
              normalizedDisplayName: normalizeCompanyName(metadata.displayName),
              updatedAt: new Date(),
            })
            .where(eq(Company.id, companyId))
            .returning();
          if (!updated) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Company not found.",
            });
          }
          const changeFields = [
            "displayName",
            "legalName",
            "domain",
            "aliases",
          ] as const;
          await createAdminAuditEvent(
            {
              actionKey: "company.updated",
              actor: ctx.session.user,
              changes: changeFields.flatMap((field) =>
                JSON.stringify(before[field]) === JSON.stringify(updated[field])
                  ? []
                  : [
                      {
                        after: updated[field],
                        before: before[field],
                        field,
                      },
                    ],
              ),
              subjects: [
                {
                  relation: "primary",
                  targetId: updated.id,
                  targetLabel: updated.displayName,
                  targetType: "company",
                },
              ],
            },
            tx,
          );
          return updated;
        });
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

      return company;
    }),

  uploadCompanyImage: permProcedure
    .input(
      z
        .object({
          companyId: z.string().uuid(),
          fileContent: z.string().max(MAX_PROFILE_PICTURE_DATA_URL_LENGTH),
        })
        .strict(),
    )
    .mutation(async ({ ctx, input }) => {
      assertCanEditMembers(ctx);
      const company = await db.query.Company.findFirst({
        where: eq(Company.id, input.companyId),
        columns: { displayName: true, id: true, logoObjectName: true },
      });
      if (!company) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Company not found.",
        });
      }

      const objectName = await uploadCompanyImageObject({
        companyId: company.id,
        fileContent: input.fileContent,
      });
      const operationId = company.logoObjectName ? randomUUID() : undefined;
      let auditEventId: string | undefined;
      try {
        await db.transaction(async (tx) => {
          const [updatedCompany] = await tx
            .update(Company)
            .set({ logoObjectName: objectName, updatedAt: new Date() })
            .where(eq(Company.id, company.id))
            .returning({ id: Company.id });
          if (!updatedCompany) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Company not found.",
            });
          }
          const auditEvent = await createAdminAuditEvent(
            {
              actionKey: "company.image.replaced",
              actor: ctx.session.user,
              metadata: { hadPrevious: Boolean(company.logoObjectName) },
              operationId,
              subjects: [
                {
                  relation: "primary",
                  targetId: company.id,
                  targetLabel: company.displayName,
                  targetType: "company",
                },
              ],
            },
            tx,
          );
          auditEventId = auditEvent.id;
        });
      } catch (error) {
        await removeCompanyImage(company.id, objectName);
        throw error;
      }

      if (company.logoObjectName && auditEventId) {
        const cleanupOutcome = await removeCompanyImage(
          company.id,
          company.logoObjectName,
        );
        await appendAdminAuditResults({
          actionKey: "company.image.replaced",
          eventId: auditEventId,
          results: [
            {
              resultOutcome: cleanupOutcome,
              targetId: company.logoObjectName,
              targetLabel: "Previous company image",
              targetType: "provider",
            },
          ],
        });
      }
      return {
        logoObjectName: objectName,
        logoUrl: await getCompanyImageUrl(company.id, objectName),
      };
    }),

  removeCompanyImage: permProcedure
    .input(companyIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanEditMembers(ctx);
      const company = await db.query.Company.findFirst({
        where: eq(Company.id, input.companyId),
        columns: { displayName: true, id: true, logoObjectName: true },
      });
      if (!company) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Company not found.",
        });
      }

      const operationId = company.logoObjectName ? randomUUID() : undefined;
      const auditEventId = await db.transaction(async (tx) => {
        await tx
          .update(Company)
          .set({ logoObjectName: null, updatedAt: new Date() })
          .where(eq(Company.id, input.companyId));
        const auditEvent = await createAdminAuditEvent(
          {
            actionKey: "company.image.removed",
            actor: ctx.session.user,
            metadata: { hadPrevious: Boolean(company.logoObjectName) },
            operationId,
            subjects: [
              {
                relation: "primary",
                targetId: company.id,
                targetLabel: company.displayName,
                targetType: "company",
              },
            ],
          },
          tx,
        );
        return auditEvent.id;
      });

      if (company.logoObjectName) {
        const cleanupOutcome = await removeCompanyImage(
          company.id,
          company.logoObjectName,
        );
        await appendAdminAuditResults({
          actionKey: "company.image.removed",
          eventId: auditEventId,
          results: [
            {
              resultOutcome: cleanupOutcome,
              targetId: company.logoObjectName,
              targetLabel: "Removed company image",
              targetType: "provider",
            },
          ],
        });
      }
      return { logoObjectName: null, logoUrl: null };
    }),

  approveCompany: permProcedure
    .input(companyIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanEditMembers(ctx);
      return db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(Company)
          .where(eq(Company.id, input.companyId))
          .for("update");
        if (
          !before ||
          (before.reviewState !== "pending" &&
            before.reviewState !== "rejected")
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only pending or rejected companies can be approved.",
          });
        }
        const [company] = await tx
          .update(Company)
          .set({ reviewState: "approved", updatedAt: new Date() })
          .where(eq(Company.id, input.companyId))
          .returning();
        if (!company) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Company not found.",
          });
        }
        await createAdminAuditEvent(
          {
            actionKey: "company.approved",
            actor: ctx.session.user,
            changes: [
              {
                after: "approved",
                before: before.reviewState,
                field: "reviewState",
              },
            ],
            subjects: [
              {
                relation: "primary",
                targetId: company.id,
                targetLabel: company.displayName,
                targetType: "company",
              },
            ],
          },
          tx,
        );
        return company;
      });
    }),

  rejectCompany: permProcedure
    .input(companyIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanEditMembers(ctx);
      return db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(Company)
          .where(eq(Company.id, input.companyId))
          .for("update");
        if (
          !before ||
          (before.reviewState !== "pending" &&
            before.reviewState !== "approved")
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only pending or approved companies can be rejected.",
          });
        }
        const [company] = await tx
          .update(Company)
          .set({ reviewState: "rejected", updatedAt: new Date() })
          .where(eq(Company.id, input.companyId))
          .returning();
        if (!company) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Company not found.",
          });
        }
        await createAdminAuditEvent(
          {
            actionKey: "company.rejected",
            actor: ctx.session.user,
            changes: [
              {
                after: "rejected",
                before: before.reviewState,
                field: "reviewState",
              },
            ],
            subjects: [
              {
                relation: "primary",
                targetId: company.id,
                targetLabel: company.displayName,
                targetType: "company",
              },
            ],
          },
          tx,
        );
        return company;
      });
    }),

  mergeCompanies: permProcedure
    .input(mergeCompaniesInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanEditMembers(ctx);

      return await db.transaction(async (tx) => {
        const operationId = randomUUID();
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

        const movedEmployment = await tx
          .select({
            employmentId: Employment.id,
            firstName: Member.firstName,
            lastName: Member.lastName,
            memberId: Member.id,
          })
          .from(Employment)
          .innerJoin(Member, eq(Member.id, Employment.memberId))
          .where(eq(Employment.companyId, duplicate.id));

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

        if (!updatedCanonical) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "The canonical company could not be updated.",
          });
        }
        await createAdminAuditEvent(
          {
            actionKey: "company.merged",
            actor: ctx.session.user,
            metadata: {
              affectedMemberCount: new Set(
                movedEmployment.map((row) => row.memberId),
              ).size,
              aliasesAfter: aliases,
              aliasesBefore: canonical.aliases,
              movedEmploymentCount: movedEmployment.length,
            },
            operationId,
            subjects: [
              {
                relation: "primary",
                targetId: canonical.id,
                targetLabel: canonical.displayName,
                targetType: "company",
              },
              {
                relation: "secondary",
                targetId: duplicate.id,
                targetLabel: duplicate.displayName,
                targetType: "company",
              },
              ...movedEmployment.map((employment) => ({
                memberId: employment.memberId,
                metadata: { effect: "moved" },
                relation: "result" as const,
                resultOutcome: "succeeded" as const,
                targetId: employment.employmentId,
                targetLabel:
                  `${employment.firstName} ${employment.lastName}`.trim(),
                targetType: "employment" as const,
              })),
            ],
          },
          tx,
        );

        return updatedCanonical;
      });
    }),
} satisfies TRPCRouterRecord;
