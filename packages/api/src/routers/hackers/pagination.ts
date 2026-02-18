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

      const [schools, majors, races, genders, gradDates] = await Promise.all([
        db
          .selectDistinct({ value: Hacker.school })
          .from(Hacker)
          .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
          .where(eq(HackerAttendee.hackathonId, input.hackathonId))
          .orderBy(asc(Hacker.school)),
        db
          .selectDistinct({ value: Hacker.major })
          .from(Hacker)
          .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
          .where(eq(HackerAttendee.hackathonId, input.hackathonId))
          .orderBy(asc(Hacker.major)),
        db
          .selectDistinct({ value: Hacker.raceOrEthnicity })
          .from(Hacker)
          .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
          .where(eq(HackerAttendee.hackathonId, input.hackathonId))
          .orderBy(asc(Hacker.raceOrEthnicity)),
        db
          .selectDistinct({ value: Hacker.gender })
          .from(Hacker)
          .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
          .where(eq(HackerAttendee.hackathonId, input.hackathonId))
          .orderBy(asc(Hacker.gender)),
        db
          .selectDistinct({ value: Hacker.gradDate })
          .from(Hacker)
          .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
          .where(eq(HackerAttendee.hackathonId, input.hackathonId))
          .orderBy(asc(Hacker.gradDate)),
      ]);

      const gradYears = Array.from(
        new Set(gradDates.map((g) => Number(g.value.slice(0, 4)))),
      )
        .filter((g) => Number.isFinite(g))
        .sort((a, b) => a - b);

      return {
        schools: schools.map((s) => s.value),
        majors: majors.map((m) => m.value),
        races: races.map((r) => r.value),
        genders: genders.map((g) => g.value),
        gradYears,
      };
    }),
};
