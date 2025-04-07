import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { and, eq, exists } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hacker,
  HackerAttendee,
  InsertHackerSchema,
} from "@forge/db/schemas/knight-hacks";

import { adminProcedure, protectedProcedure } from "../trpc";

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
  createHacker: protectedProcedure
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
} satisfies TRPCRouterRecord;
