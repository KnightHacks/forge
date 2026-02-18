import { z } from "zod";

import { and, asc, count, desc, eq, ilike, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Hacker, HackerAttendee } from "@forge/db/schemas/knight-hacks";

import { permProcedure } from "../../trpc";
import { controlPerms } from "../../utils";

export const hackerPaginationRouter = {
  getHackersPage: permProcedure
    .input(
      z.object({
        hackathonId: z.string(),
        currentPage: z.number().min(1).optional(),
        pageSize: z.number().min(1).optional(),
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
      controlPerms.or(["READ_HACKERS", "CHECKIN_HACK_EVENT"], ctx);

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
        conditions.push(eq(HackerAttendee.status, input.statusFilter));
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
        conditions.push(eq(Hacker.isFirstTime, input.isFirstTimeFilter));
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
          status: HackerAttendee.status,
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
      controlPerms.or(["READ_HACKERS", "CHECKIN_HACK_EVENT"], ctx);

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
        conditions.push(eq(HackerAttendee.status, input.statusFilter));
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
        conditions.push(eq(Hacker.isFirstTime, input.isFirstTimeFilter));
      }

      const result = await db
        .select({ count: count() })
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
      controlPerms.or(["READ_HACKERS", "CHECKIN_HACK_EVENT"], ctx);

      const rows = await db
        .select({
          school: Hacker.school,
          major: Hacker.major,
          race: Hacker.raceOrEthnicity,
          gender: Hacker.gender,
          gradDate: Hacker.gradDate,
          isFirstTime: Hacker.isFirstTime,
        })
        .from(Hacker)
        .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
        .where(eq(HackerAttendee.hackathonId, input.hackathonId));

      const schoolCounts = new Map<string, number>();
      const majorCounts = new Map<string, number>();
      const raceCounts = new Map<string, number>();
      const genderCounts = new Map<string, number>();
      const gradYearCounts = new Map<number, number>();
      let firstTimeCount = 0;
      let returningCount = 0;

      for (const row of rows) {
        schoolCounts.set(row.school, (schoolCounts.get(row.school) ?? 0) + 1);
        majorCounts.set(row.major, (majorCounts.get(row.major) ?? 0) + 1);
        raceCounts.set(row.race, (raceCounts.get(row.race) ?? 0) + 1);
        genderCounts.set(row.gender, (genderCounts.get(row.gender) ?? 0) + 1);

        const gradYear = Number(row.gradDate.slice(0, 4));
        if (Number.isFinite(gradYear)) {
          gradYearCounts.set(gradYear, (gradYearCounts.get(gradYear) ?? 0) + 1);
        }

        if (row.isFirstTime) {
          firstTimeCount += 1;
        } else {
          returningCount += 1;
        }
      }

      return {
        schools: Array.from(schoolCounts.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([value, count]) => ({ value, count })),
        majors: Array.from(majorCounts.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([value, count]) => ({ value, count })),
        races: Array.from(raceCounts.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([value, count]) => ({ value, count })),
        genders: Array.from(genderCounts.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([value, count]) => ({ value, count })),
        gradYears: Array.from(gradYearCounts.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([value, count]) => ({ value, count })),
        hackerTypeCounts: {
          firstTime: firstTimeCount,
          returning: returningCount,
        },
      };
    }),
};
