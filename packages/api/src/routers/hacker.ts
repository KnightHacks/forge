import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, eq, exists } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hacker,
  HackerAttendee,
  InsertHackerSchema,
} from "@forge/db/schemas/knight-hacks";

import { adminProcedure, protectedProcedure } from "../trpc";
import { log } from "../utils";

export const hackerRouter = {
  getHacker: protectedProcedure.query(async ({ ctx }) => {
    const hacker = await db
      .select()
      .from(Hacker)
      .where(eq(Hacker.userId, ctx.session.user.id));

    if (hacker.length === 0) return null; // Can't return undefined in trpc
    return hacker[hacker.length - 1];
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

  // Temporarily admin-only until we roll out hacker applications
  createHacker: adminProcedure
    .input(
      InsertHackerSchema.omit({
        userId: true,
        age: true,
        discordUser: true,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const existingHacker = await db
        .select()
        .from(Hacker)
        .where(eq(Hacker.userId, userId));

      if (existingHacker.length > 0) {
        throw new Error("Hacker already exists for this user.");
      }

      const today = new Date();
      const birthDate = new Date(input.dob);
      const hasBirthdayPassed =
        birthDate.getMonth() < today.getMonth() ||
        (birthDate.getMonth() === today.getMonth() &&
          birthDate.getDate() <= today.getDate());
      const newAge = hasBirthdayPassed
        ? today.getFullYear() - birthDate.getFullYear()
        : today.getFullYear() - birthDate.getFullYear() - 1;

      await db.insert(Hacker).values({
        ...input,
        discordUser: ctx.session.user.name ?? "",
        userId,
        age: newAge,
        phoneNumber: input.phoneNumber === "" ? null : input.phoneNumber,
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

      const { id, dob, ...updateData } = input;

      const hacker = await db.query.Hacker.findFirst({
        where: (t, { eq }) => eq(t.id, id),
      });

      if (!hacker) {
        throw new TRPCError({
          message: "Hacker not found!",
          code: "NOT_FOUND",
        });
      }

      const resume = input.resumeUrl ? input.resumeUrl : hacker.resumeUrl;

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
          resumeUrl: resume,
          dob: dob,
          age: newAge,
          phoneNumber: input.phoneNumber == "" ? null : input.phoneNumber,
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
    }),
} satisfies TRPCRouterRecord;
