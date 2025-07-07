import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import QRCode from "qrcode";
import { z } from "zod";

import {
  BUCKET_NAME,
  KNIGHTHACKS_S3_BUCKET_REGION,
} from "@forge/consts/knight-hacks";
import { and, eq, exists } from "@forge/db";
import { db } from "@forge/db/client";
import { Session } from "@forge/db/schemas/auth";
import {
  Hacker,
  HackerAttendee,
  InsertHackerSchema,
} from "@forge/db/schemas/knight-hacks";

import { minioClient } from "../minio/minio-client";
import { adminProcedure, protectedProcedure } from "../trpc";
import { log } from "../utils";

export const hackerRouter = {
  getHacker: protectedProcedure
    .input(z.object({ hackathonName: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      if (input.hackathonName == undefined) {
        const hackathon = await db.query.Hackathon.findFirst({
          where: (t, { gt }) => gt(t.endDate, new Date()),
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

  getAllHackers: adminProcedure
    .input(z.object({ hackathonName: z.string().optional() }))
    .query(async ({ input }) => {
      const hackathonName = input.hackathonName;

      if (!hackathonName) {
        return await db.query.Hacker.findMany();
      }

      const hackathon = await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.name, hackathonName),
      });

      if (!hackathon) {
        throw new TRPCError({
          message: "Hackathon not found!",
          code: "NOT_FOUND",
        });
      }

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
                  eq(HackerAttendee.hackathonId, hackathon.id),
                  eq(HackerAttendee.hackerId, Hacker.id),
                ),
              ),
          ),
        );

      return hackers;
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

      const hackathon = await db.query.Hackathon.findFirst({
        where: (t, { eq }) => eq(t.name, hackathonName),
      });

      if (!hackathon) {
        throw new TRPCError({
          message: "Hackathon not found!",
          code: "NOT_FOUND",
        });
      }

      const existingHacker = await db
        .select()
        .from(Hacker)
        .innerJoin(HackerAttendee, eq(Hacker.id, HackerAttendee.hackerId))
        .where(
          and(
            eq(Hacker.userId, userId),
            eq(HackerAttendee.hackathonId, hackathon.id),
          ),
        );

      if (existingHacker.length > 0) {
        throw new Error(
          "Hacker already exists for this user in this hackathon.",
        );
      }

      // Generate QR code for first-time hacker registration
      try {
        const existingHackerProfile = await db
          .select({ id: Hacker.id })
          .from(Hacker)
          .where(eq(Hacker.userId, userId));

        if (existingHackerProfile.length === 0) {
          const objectName = `qr-code-${userId}.png`;
          const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
          if (!bucketExists) {
            await minioClient.makeBucket(
              BUCKET_NAME,
              KNIGHTHACKS_S3_BUCKET_REGION,
            );
          }
          const qrData = `user:${userId}`;
          const qrBuffer = await QRCode.toBuffer(qrData, { type: "png" });
          await minioClient.putObject(
            BUCKET_NAME,
            objectName,
            qrBuffer,
            qrBuffer.length,
            { "Content-Type": "image/png" },
          );
        }
      } catch (error) {
        console.error("Error with generating QR code: ", error);
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

      await db.insert(HackerAttendee).values({
        hackerId: insertedHacker?.id ?? "",
        hackathonId: hackathon.id,
      });

      await log({
        title: `Hacker Created for ${hackathon.displayName}`,
        message: `${hackerData.firstName} ${hackerData.lastName} has signed up for the upcoming hackathon: ${hackathon.name.toUpperCase()}!`,
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
    .input(
      InsertHackerSchema.pick({ id: true, status: true }).extend({
        hackathonName: z.string().optional(),
      }),
    )
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
        title: `Hacker Status Updated ${input.hackathonName ? `for ${input.hackathonName}` : ""}`,
        message: `Hacker status for ${hacker.firstName} ${hacker.lastName} has changed to ${input.status}!`,
        color: "tk_blue",
        userId: ctx.session.user.discordUserId,
      });
    }),
  deleteHacker: adminProcedure
    .input(
      InsertHackerSchema.pick({
        id: true,
        firstName: true,
        lastName: true,
      }).extend({
        hackathonName: z.string().optional(),
      }),
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
        title: `Hacker Deleted for ${input.hackathonName}`,
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
} satisfies TRPCRouterRecord;
