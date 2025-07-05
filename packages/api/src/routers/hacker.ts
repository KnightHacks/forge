import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, count, desc, eq, exists, getTableColumns } from "@forge/db";
import { db } from "@forge/db/client";
import { Session } from "@forge/db/schemas/auth";
import {
  Hackathon,
  Hacker,
  HackerAttendee,
  InsertHackerSchema,
} from "@forge/db/schemas/knight-hacks";

import { adminProcedure, protectedProcedure } from "../trpc";
import { log } from "../utils";

export const hackerRouter = {
  getHacker: protectedProcedure
    .input(z.object({ hackathonName: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      if (input.hackathonName == undefined) {
        const hackathon = await db.query.Hackathon.findFirst({
          where: (t, { and, lt, gte }) =>
            and(lt(t.endDate, new Date()), gte(t.startDate, new Date())),
        });

        if (!hackathon) {
          return null;
        }

        const hacker = await db
          .select()
          .from(Hacker)
          .where(eq(Hacker.userId, ctx.session.user.id));
        return hacker[0];
      }

      const hackathon = await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.name, input.hackathonName ?? ""),
      });

      if (!hackathon) {
        throw new TRPCError({
          message: "Hackathon not found!",
          code: "NOT_FOUND",
        });
      }

      const hacker = await db.query.Hacker.findFirst({
        where: (t, { eq }) => eq(t.userId, ctx.session.user.id),
      });

      if (!hacker) {
        return null;
      }

      // Check if the hacker is registered for this specific hackathon
      const hackerAttendee = await db.query.HackerAttendee.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.hackerId, hacker.id), eq(t.hackathonId, hackathon.id)),
      });

      if (!hackerAttendee) {
        return null;
      }

      return hacker;
    }),

  getHackers: adminProcedure.input(z.string()).query(async ({ input }) => {
    const hackers = await db
      .select()
      .from(Hacker)
      .where(
        exists(
          db
            .select()
            .from(HackerAttendee)
            .where(
              and(
                eq(HackerAttendee.hackathonId, input),
                eq(HackerAttendee.hackerId, Hacker.id),
              ),
            ),
        ),
      );

    if (hackers.length === 0) return null; // Can't return undefined in trpc
    return hackers;
  }),

  getAllHackers: adminProcedure.query(async () => {
    return await db.query.Hacker.findMany();
  }),

  createHacker: protectedProcedure
    .input(
      z.object({
        ...InsertHackerSchema.omit({
          userId: true,
          age: true,
          discordUser: true,
        }).shape,
        hackathonName: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const { hackathonName, ...hackerData } = input;

      const existingHacker = await db
        .select()
        .from(Hacker)
        .where(eq(Hacker.userId, userId));

      if (existingHacker.length > 0) {
        throw new Error("Hacker already exists for this user.");
      }

      const today = new Date();
      const birthDate = new Date(hackerData.dob);
      const hasBirthdayPassed =
        birthDate.getMonth() < today.getMonth() ||
        (birthDate.getMonth() === today.getMonth() &&
          birthDate.getDate() <= today.getDate());
      const newAge = hasBirthdayPassed
        ? today.getFullYear() - birthDate.getFullYear()
        : today.getFullYear() - birthDate.getFullYear() - 1;

      await db.insert(Hacker).values({
        ...hackerData,
        discordUser: ctx.session.user.name ?? "",
        userId,
        age: newAge,
        phoneNumber:
          hackerData.phoneNumber === "" ? null : hackerData.phoneNumber,
        status: "pending",
      });

      const insertedHacker = await db.query.Hacker.findFirst({
        where: (t, { eq }) => eq(t.userId, userId),
      });

      const hackathon = await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.name, hackathonName),
      });

      if (!hackathon) {
        throw new TRPCError({
          message: "Hackathon not found!",
          code: "NOT_FOUND",
        });
      }

      await db.insert(HackerAttendee).values({
        hackerId: insertedHacker?.id ?? "",
        hackathonId: hackathon.id,
      });

      await log({
        title: "Hacker Created",
        message: `${hackerData.firstName} ${hackerData.lastName} has signed up for the hackathon!`,
        color: "tk_blue",
        userId: ctx.session.user.discordUserId,
      });
    }),

  updateHacker: protectedProcedure
    .input(
      InsertHackerSchema.omit({
        userId: true,
        age: true,
        discordUser: true,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Hacker ID is required to update a member!",
          code: "BAD_REQUEST",
        });
      }

      const { id, dob, phoneNumber, ...updateData } = input;

      const hacker = await db.query.Hacker.findFirst({
        where: (t, { eq }) => eq(t.id, id),
      });

      if (!hacker) {
        throw new TRPCError({
          message: "Hacker not found!",
          code: "NOT_FOUND",
        });
      }

      const normalizedPhone = phoneNumber === "" ? null : phoneNumber;

      // Check if the age has been updated
      const today = new Date();
      const birthDate = new Date(dob);
      const hasBirthdayPassed =
        birthDate.getMonth() < today.getMonth() ||
        (birthDate.getMonth() === today.getMonth() &&
          birthDate.getDate() <= today.getDate());
      const newAge = hasBirthdayPassed
        ? today.getFullYear() - birthDate.getFullYear()
        : today.getFullYear() - birthDate.getFullYear() - 1;

      await db
        .update(Hacker)
        .set({
          ...updateData,
          resumeUrl: updateData.resumeUrl,
          dob: dob,
          age: newAge,
          phoneNumber: normalizedPhone,
        })
        .where(eq(Hacker.userId, ctx.session.user.id));

      // Create a log of the changes for logger
      const changes = Object.keys(updateData).reduce(
        (acc, key) => {
          if (
            hacker[key as keyof typeof hacker] !==
            updateData[key as keyof typeof updateData]
          ) {
            acc[key] = {
              before: hacker[key as keyof typeof hacker],
              after: updateData[key as keyof typeof updateData],
            };
          }
          return acc;
        },
        {} as Record<
          string,
          {
            before: string | number | boolean | null;
            after: string | boolean | null | undefined;
          }
        >,
      );

      if ((hacker.phoneNumber ?? "") !== (normalizedPhone ?? "")) {
        changes.phoneNumber = {
          before: hacker.phoneNumber,
          after: normalizedPhone,
        };
      }

      // Convert the changes object to a string for the log
      const changesString = Object.entries(changes)
        .map(([key, value]) => {
          return `\n${key}\n **Before:** ${value.before} -> **After:** ${value.after}`;
        })
        .join("\n");

      // Log the changes
      await log({
        title: "Hacker Updated",
        message: `Blade profile for ${hacker.firstName} ${hacker.lastName} has been updated.
            \n**Changes:**\n${changesString}`,
        color: "tk_blue",
        userId: ctx.session.user.discordUserId,
      });
    }),

  updateHackerStatus: adminProcedure
    .input(InsertHackerSchema.pick({ id: true, status: true }))
    .mutation(async ({ input, ctx }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Hacker ID is required to update a member's status!",
          code: "BAD_REQUEST",
        });
      }

      const hacker = await db.query.Hacker.findFirst({
        where: (t, { eq }) => eq(t.id, input.id ?? ""),
      });

      if (!hacker) {
        throw new TRPCError({
          message: "Hacker not found!",
          code: "NOT_FOUND",
        });
      }

      await db
        .update(Hacker)
        .set({ status: input.status })
        .where(eq(Hacker.id, input.id));

      await log({
        title: "Hacker Status Updated",
        message: `Hacker status for ${hacker.firstName} ${hacker.lastName} has changed to ${input.status}!`,
        color: "tk_blue",
        userId: ctx.session.user.discordUserId,
      });
    }),
  deleteHacker: adminProcedure
    .input(
      InsertHackerSchema.pick({ id: true, firstName: true, lastName: true }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Hacker ID is required to delete a member!",
          code: "BAD_REQUEST",
        });
      }

      await db.delete(Hacker).where(eq(Hacker.id, input.id));

      await log({
        title: "Hacker Deleted",
        message: `Profile for ${input.firstName} ${input.lastName} has been deleted.`,
        color: "uhoh_red",
        userId: ctx.session.user.discordUserId,
      });

      if (ctx.session.user.id) {
        await db.delete(Session).where(eq(Session.userId, ctx.session.user.id));
      }
    }),

  confirmHacker: protectedProcedure
    .input(InsertHackerSchema.pick({ id: true }))
    .mutation(async ({ input }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Hacker ID is required to update a member!",
          code: "BAD_REQUEST",
        });
      }

      const { id } = input;

      const hacker = await db.query.Hacker.findFirst({
        where: (t, { eq }) => eq(t.id, id),
      });

      if (!hacker) {
        throw new TRPCError({
          message: "Hacker not found!",
          code: "NOT_FOUND",
        });
      }

      if (hacker.status === "confirmed") {
        throw new TRPCError({
          message: "Hacker has already been confirmed!",
          code: "UNAUTHORIZED",
        });
      } else if (hacker.status !== "accepted") {
        throw new TRPCError({
          message: "Hacker has not been accepted!",
          code: "UNAUTHORIZED",
        });
      }

      await db
        .update(Hacker)
        .set({
          status: "confirmed",
        })
        .where(eq(Hacker.id, id));

      await log({
        title: "Hacker Confirmed",
        message: `${hacker.firstName} ${hacker.lastName} has confirmed their attendance!`,
        color: "success_green",
        userId: hacker.userId,
      });
    }),

  withdrawHacker: protectedProcedure
    .input(InsertHackerSchema.pick({ id: true }))
    .mutation(async ({ input }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Hacker ID is required to update a member!",
          code: "BAD_REQUEST",
        });
      }

      const { id } = input;

      const hacker = await db.query.Hacker.findFirst({
        where: (t, { eq }) => eq(t.id, id),
      });

      if (!hacker) {
        throw new TRPCError({
          message: "Hacker not found!",
          code: "NOT_FOUND",
        });
      }

      if (hacker.status !== "confirmed") {
        throw new TRPCError({
          message: "Hacker is not confirmed!",
          code: "UNAUTHORIZED",
        });
      }

      await db
        .update(Hacker)
        .set({
          status: "withdrawn",
        })
        .where(eq(Hacker.id, id));
    }),

  getHackathons: protectedProcedure.query(async ({ ctx }) => {
    // Get each hackathon and numAttended
    const hackathonsSubQuery = db
      .select({
        id: Hackathon.id,
        numAttended: count(HackerAttendee.id).as("numAttended"),
      })
      .from(Hackathon)
      .leftJoin(HackerAttendee, eq(Hackathon.id, HackerAttendee.hackathonId))
      .groupBy(Hackathon.id)
      .as("hackathonsSubQuery");

    const hackathons = await db
      .select({
        ...getTableColumns(Hackathon),
        numAttended: hackathonsSubQuery.numAttended,
      })
      .from(Hackathon)
      .leftJoin(HackerAttendee, eq(Hackathon.id, HackerAttendee.hackathonId))
      .leftJoin(Hacker, eq(HackerAttendee.hackerId, Hacker.id))
      .leftJoin(hackathonsSubQuery, eq(hackathonsSubQuery.id, Hackathon.id)) // Add numAttended to each corresponding event
      .where(eq(Hacker.userId, ctx.session.user.id))
      .orderBy(desc(Hackathon.startDate));
    return hackathons;
  }),
  hackathonCheckIn: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        hackathonId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const hacker = await db.query.Hacker.findFirst({
        where: (t, { eq }) => eq(t.userId, input.userId),
      });

      const hackathon = await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.id, input.hackathonId),
      });

      if (!hacker || !hackathon) {
        return;
      }

      if (hacker.status !== "confirmed") {
        throw new TRPCError({
          code: "CONFLICT",
          message: `${hacker.firstName} ${hacker.lastName} has not confirmed for this hackathon`,
        });
      }

      const duplicates = await db
        .select()
        .from(HackerAttendee)
        .where(
          and(
            eq(HackerAttendee.hackerId, hacker.id),
            eq(HackerAttendee.hackathonId, input.hackathonId),
          ),
        );

      if (duplicates.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `${hacker.firstName} ${hacker.lastName} is already checked into the hackathon`,
        });
      }

      const hackerAttendee = {
        hackerId: hacker.id,
        hackathonId: input.hackathonId,
      };
      await db.insert(HackerAttendee).values(hackerAttendee);

      await log({
        title: "Hacker Checked-In",
        message: `${hacker.firstName} ${hacker.lastName} has been checked in to Hackathon: ${hackathon.name}`,
        color: "success_green",
        userId: ctx.session.user.discordUserId,
      });

      return {
        message: `${hacker.firstName} ${hacker.lastName} has been checked in to this Hackathon!`,
      };
    }),
} satisfies TRPCRouterRecord;
