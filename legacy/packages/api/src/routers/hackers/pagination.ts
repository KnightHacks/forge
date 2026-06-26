import { z } from "zod";

import { and, asc, count, desc, eq, ilike, ne, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Hacker, HackerAttendee } from "@forge/db/schemas/knight-hacks";
import { permissions } from "@forge/utils";

import { permProcedure } from "../../trpc";

const SOFT_BLACKLIST_HACKER_ID = "7f89fe4d-26f0-42fe-ac98-22d8f648d7a7";

export const hackerPaginationRouter = {
  getHackersPage: permProcedure
    .input(
      z.object({
        hackathonId: z.string(),
        currentPage: z.number().min(1).optional(),
        pageSize: z.number().min(1).max(100).optional(),
        searchTerm: z.string().optional(),
        sortField: z
          .enum([
            "firstName",
            "lastName",
            "email",
            "discordUser",
            "dateCreated",
          ])
          .optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
        sortByTime: z.boolean().optional(),
        statusFilter: z
          .enum([
            "pending",
            "accepted",
            "confirmed",
            "withdrawn",
            "denied",
            "waitlisted",
          ])
          .optional(),
        schoolFilter: z.string().optional(),
        majorFilter: z.string().optional(),
        raceFilter: z.string().optional(),
        genderFilter: z.string().optional(),
        gradYearFilter: z.number().int().optional(),
        isFirstTimeFilter: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      permissions.controlPerms.or(["READ_HACKERS", "CHECKIN_HACK_EVENT"], ctx);

      const currentPage = input.currentPage ?? 1;
      const pageSize = input.pageSize ?? 10;
      const offset = (currentPage - 1) * pageSize;

      const conditions = [eq(HackerAttendee.hackathonId, input.hackathonId)];

      if (input.searchTerm && input.searchTerm.length > 0) {
        const searchPattern = `%${input.searchTerm}%`;
        const searchCondition = or(
          ilike(Hacker.firstName, searchPattern),
          ilike(Hacker.lastName, searchPattern),
          ilike(Hacker.email, searchPattern),
          ilike(Hacker.discordUser, searchPattern),
          sql`CONCAT(${Hacker.firstName}, ' ', ${Hacker.lastName}) ILIKE ${searchPattern}`,
        );

        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      if (input.statusFilter) {
        if (input.statusFilter === "denied") {
          const deniedCondition = or(
            eq(HackerAttendee.status, "denied"),
            eq(Hacker.id, SOFT_BLACKLIST_HACKER_ID),
          );
          if (deniedCondition) conditions.push(deniedCondition);
        } else {
          const nonDeniedCondition = and(
            eq(HackerAttendee.status, input.statusFilter),
            ne(Hacker.id, SOFT_BLACKLIST_HACKER_ID),
          );
          if (nonDeniedCondition) conditions.push(nonDeniedCondition);
        }
      }
      if (input.schoolFilter) {
        conditions.push(
          eq(
            Hacker.school,
            input.schoolFilter as (typeof Hacker.school.enumValues)[number],
          ),
        );
      }
      if (input.majorFilter) {
        conditions.push(
          eq(
            Hacker.major,
            input.majorFilter as (typeof Hacker.major.enumValues)[number],
          ),
        );
      }
      if (input.raceFilter) {
        conditions.push(
          eq(
            Hacker.raceOrEthnicity,
            input.raceFilter as (typeof Hacker.raceOrEthnicity.enumValues)[number],
          ),
        );
      }
      if (input.genderFilter) {
        conditions.push(
          eq(
            Hacker.gender,
            input.genderFilter as (typeof Hacker.gender.enumValues)[number],
          ),
        );
      }
      if (input.gradYearFilter) {
        conditions.push(
          sql`EXTRACT(YEAR FROM ${Hacker.gradDate}) = ${input.gradYearFilter}`,
        );
      }
      if (input.isFirstTimeFilter !== undefined) {
        conditions.push(
          sql`COALESCE(${Hacker.isFirstTime}, false) = ${input.isFirstTimeFilter}`,
        );
      }

      let query = db
        .select({
          id: Hacker.id,
          userId: Hacker.userId,
          firstName: Hacker.firstName,
          lastName: Hacker.lastName,
          gender: Hacker.gender,
          discordUser: Hacker.discordUser,
          age: Hacker.age,
          country: Hacker.country,
          email: Hacker.email,
          phoneNumber: Hacker.phoneNumber,
          school: Hacker.school,
          major: Hacker.major,
          levelOfStudy: Hacker.levelOfStudy,
          raceOrEthnicity: Hacker.raceOrEthnicity,
          shirtSize: Hacker.shirtSize,
          githubProfileUrl: Hacker.githubProfileUrl,
          linkedinProfileUrl: Hacker.linkedinProfileUrl,
          websiteUrl: Hacker.websiteUrl,
          resumeUrl: Hacker.resumeUrl,
          dob: Hacker.dob,
          gradDate: Hacker.gradDate,
          survey1: Hacker.survey1,
          survey2: Hacker.survey2,
          isFirstTime: Hacker.isFirstTime,
          foodAllergies: Hacker.foodAllergies,
          agreesToReceiveEmailsFromMLH: Hacker.agreesToReceiveEmailsFromMLH,
          agreesToMLHCodeOfConduct: Hacker.agreesToMLHCodeOfConduct,
          agreesToMLHDataSharing: Hacker.agreesToMLHDataSharing,
          dateCreated: Hacker.dateCreated,
          timeCreated: Hacker.timeCreated,
          status: sql<string>`CASE
            WHEN ${Hacker.id} = ${SOFT_BLACKLIST_HACKER_ID} THEN 'denied'
            ELSE ${HackerAttendee.status}
          END`,
          timeApplied: HackerAttendee.timeApplied,
          timeConfirmed: HackerAttendee.timeConfirmed,
        })
        .from(Hacker)
        .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
        .where(and(...conditions));

      if (input.sortByTime) {
        query = query.orderBy(
          input.sortOrder === "desc"
            ? desc(Hacker.dateCreated)
            : asc(Hacker.dateCreated),
          input.sortOrder === "desc"
            ? desc(Hacker.timeCreated)
            : asc(Hacker.timeCreated),
        ) as typeof query;
      } else if (input.sortField && input.sortOrder) {
        const sortColumn = Hacker[input.sortField];
        query = query.orderBy(
          input.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn),
        ) as typeof query;
      } else {
        query = query.orderBy(asc(Hacker.id)) as typeof query;
      }

      return await query.offset(offset).limit(pageSize);
    }),

  getHackerCount: permProcedure
    .input(
      z.object({
        hackathonId: z.string(),
        searchTerm: z.string().optional(),
        statusFilter: z
          .enum([
            "pending",
            "accepted",
            "confirmed",
            "withdrawn",
            "denied",
            "waitlisted",
          ])
          .optional(),
        schoolFilter: z.string().optional(),
        majorFilter: z.string().optional(),
        raceFilter: z.string().optional(),
        genderFilter: z.string().optional(),
        gradYearFilter: z.number().int().optional(),
        isFirstTimeFilter: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      permissions.controlPerms.or(["READ_HACKERS", "CHECKIN_HACK_EVENT"], ctx);

      const conditions = [eq(HackerAttendee.hackathonId, input.hackathonId)];

      if (input.searchTerm && input.searchTerm.length > 0) {
        const searchPattern = `%${input.searchTerm}%`;
        const searchCondition = or(
          ilike(Hacker.firstName, searchPattern),
          ilike(Hacker.lastName, searchPattern),
          ilike(Hacker.email, searchPattern),
          ilike(Hacker.discordUser, searchPattern),
          sql`CONCAT(${Hacker.firstName}, ' ', ${Hacker.lastName}) ILIKE ${searchPattern}`,
        );

        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      if (input.statusFilter) {
        if (input.statusFilter === "denied") {
          const deniedCondition = or(
            eq(HackerAttendee.status, "denied"),
            eq(Hacker.id, SOFT_BLACKLIST_HACKER_ID),
          );
          if (deniedCondition) conditions.push(deniedCondition);
        } else {
          const nonDeniedCondition = and(
            eq(HackerAttendee.status, input.statusFilter),
            ne(Hacker.id, SOFT_BLACKLIST_HACKER_ID),
          );
          if (nonDeniedCondition) conditions.push(nonDeniedCondition);
        }
      }
      if (input.schoolFilter) {
        conditions.push(
          eq(
            Hacker.school,
            input.schoolFilter as (typeof Hacker.school.enumValues)[number],
          ),
        );
      }
      if (input.majorFilter) {
        conditions.push(
          eq(
            Hacker.major,
            input.majorFilter as (typeof Hacker.major.enumValues)[number],
          ),
        );
      }
      if (input.raceFilter) {
        conditions.push(
          eq(
            Hacker.raceOrEthnicity,
            input.raceFilter as (typeof Hacker.raceOrEthnicity.enumValues)[number],
          ),
        );
      }
      if (input.genderFilter) {
        conditions.push(
          eq(
            Hacker.gender,
            input.genderFilter as (typeof Hacker.gender.enumValues)[number],
          ),
        );
      }
      if (input.gradYearFilter) {
        conditions.push(
          sql`EXTRACT(YEAR FROM ${Hacker.gradDate}) = ${input.gradYearFilter}`,
        );
      }
      if (input.isFirstTimeFilter !== undefined) {
        conditions.push(
          sql`COALESCE(${Hacker.isFirstTime}, false) = ${input.isFirstTimeFilter}`,
        );
      }

      const result = await db
        .select({ count: count().mapWith(Number) })
        .from(Hacker)
        .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
        .where(and(...conditions));

      return result[0]?.count ?? 0;
    }),

  getHackerFilterOptions: permProcedure
    .input(
      z.object({
        hackathonId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      permissions.controlPerms.or(["READ_HACKERS", "CHECKIN_HACK_EVENT"], ctx);
      const gradYearExpr = sql<number>`EXTRACT(YEAR FROM ${Hacker.gradDate})::int`;
      const isFirstTimeExpr = sql<boolean>`COALESCE(${Hacker.isFirstTime}, false)`;
      const whereClause = eq(HackerAttendee.hackathonId, input.hackathonId);

      const [schools, majors, races, genders, gradYears, hackerTypeCounts] =
        await Promise.all([
          db
            .select({
              value: Hacker.school,
              count: count().mapWith(Number),
            })
            .from(Hacker)
            .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
            .where(whereClause)
            .groupBy(Hacker.school)
            .orderBy(asc(Hacker.school)),
          db
            .select({
              value: Hacker.major,
              count: count().mapWith(Number),
            })
            .from(Hacker)
            .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
            .where(whereClause)
            .groupBy(Hacker.major)
            .orderBy(asc(Hacker.major)),
          db
            .select({
              value: Hacker.raceOrEthnicity,
              count: count().mapWith(Number),
            })
            .from(Hacker)
            .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
            .where(whereClause)
            .groupBy(Hacker.raceOrEthnicity)
            .orderBy(asc(Hacker.raceOrEthnicity)),
          db
            .select({
              value: Hacker.gender,
              count: count().mapWith(Number),
            })
            .from(Hacker)
            .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
            .where(whereClause)
            .groupBy(Hacker.gender)
            .orderBy(asc(Hacker.gender)),
          db
            .select({
              value: gradYearExpr.mapWith(Number),
              count: count().mapWith(Number),
            })
            .from(Hacker)
            .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
            .where(whereClause)
            .groupBy(gradYearExpr)
            .orderBy(asc(gradYearExpr)),
          db
            .select({
              value: isFirstTimeExpr,
              count: count().mapWith(Number),
            })
            .from(Hacker)
            .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
            .where(whereClause)
            .groupBy(isFirstTimeExpr),
        ]);

      const firstTimeCount =
        hackerTypeCounts.find((row) => row.value === true)?.count ?? 0;
      const returningCount =
        hackerTypeCounts.find((row) => row.value === false)?.count ?? 0;

      return {
        schools,
        majors,
        races,
        genders,
        gradYears,
        hackerTypeCounts: {
          firstTime: firstTimeCount,
          returning: returningCount,
        },
      };
    }),
};
