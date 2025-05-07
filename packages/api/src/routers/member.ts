import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import QRCode from "qrcode";
import { z } from "zod";

import {
  BUCKET_NAME,
  DUES_PAYMENT,
  KNIGHTHACKS_S3_BUCKET_REGION,
} from "@forge/consts/knight-hacks";
import {
  and,
  count,
  desc,
  eq,
  exists,
  getTableColumns,
  isNull,
  sql,
} from "@forge/db";
import { db } from "@forge/db/client";
import {
  DuesPayment,
  Event,
  EventAttendee,
  InsertMemberSchema,
  Member,
} from "@forge/db/schemas/knight-hacks";

import { minioClient } from "../minio/minio-client";
import { adminProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { log } from "../utils";

export const memberRouter = {
  // -------------------- MEMBER DASHBOARD ENDPOINTS --------------------
  createMember: protectedProcedure
    .input(
      InsertMemberSchema.omit({
        userId: true,
        age: true,
        discordUser: true,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.session.user.id;

        const existingMember = await db
          .select()
          .from(Member)
          .where(eq(Member.userId, userId));

        if (existingMember.length === 0) {
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
            {
              "Content-Type": "image/png",
            },
          );
        }
      } catch (error) {
        console.error("Error with generating QR code: ", error);
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

      await db.insert(Member).values({
        ...input,
        discordUser: ctx.session.user.name ?? "",
        userId: ctx.session.user.id,
        age: newAge,
        phoneNumber: input.phoneNumber == "" ? null : input.phoneNumber,
      });

      await log({
        title: "Member Created",
        message: `${input.firstName} ${input.lastName} has signed up for Blade`,
        color: "tk_blue",
        userId: ctx.session.user.discordUserId,
      });
    }),

  updateMember: protectedProcedure
    .input(
      InsertMemberSchema.omit({
        userId: true,
        age: true,
        discordUser: true,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Member ID is required to update a member!",
          code: "BAD_REQUEST",
        });
      }

      const { id, dob, ...updateData } = input;

      const member = await db.query.Member.findFirst({
        where: (t, { eq }) => eq(t.id, id),
      });

      if (!member) {
        throw new TRPCError({
          message: "Member not found!",
          code: "NOT_FOUND",
        });
      }
      const resume = input.resumeUrl ?? member.resumeUrl;

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
        .update(Member)
        .set({
          ...updateData,
          resumeUrl: resume,
          dob: dob,
          age: newAge,
          phoneNumber: input.phoneNumber == "" ? null : input.phoneNumber,
        })
        .where(eq(Member.userId, ctx.session.user.id));

      // Create a log of the changes for logger
      const changes = Object.keys(updateData).reduce(
        (acc, key) => {
          if (
            member[key as keyof typeof member] !==
            updateData[key as keyof typeof updateData]
          ) {
            acc[key] = {
              before: member[key as keyof typeof member],
              after: updateData[key as keyof typeof updateData],
            };
          }
          return acc;
        },
        {} as Record<
          string,
          {
            before: string | number | null;
            after: string | number | null | undefined;
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
        title: "Member Updated",
        message: `Blade profile for ${member.firstName} ${member.lastName} has been updated.
        \n**Changes:**\n${changesString}`,
        color: "tk_blue",
        userId: ctx.session.user.discordUserId,
      });
    }),

  deleteMember: protectedProcedure
    .input(
      InsertMemberSchema.pick({ id: true, firstName: true, lastName: true }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Member ID is required to delete a member!",
          code: "BAD_REQUEST",
        });
      }

      await db.delete(Member).where(eq(Member.id, input.id));

      await log({
        title: "Member Deleted",
        message: `Profile for ${input.firstName} ${input.lastName} has been deleted.`,
        color: "uhoh_red",
        userId: ctx.session.user.discordUserId,
      });
    }),

  getMember: protectedProcedure.query(async ({ ctx }) => {
    const member = await db
      .select()
      .from(Member)
      .where(eq(Member.userId, ctx.session.user.id));

    if (member.length === 0) return null; // Can't return undefined in trpc
    return member[member.length - 1];
  }),

  getEvents: protectedProcedure.query(async ({ ctx }) => {
    // Get each event and numAttended
    const eventsSubQuery = db
      .select({
        id: Event.id,
        numAttended: count(EventAttendee.id).as("numAttended"),
      })
      .from(Event)
      .leftJoin(EventAttendee, eq(Event.id, EventAttendee.eventId))
      .groupBy(Event.id)
      .as("eventsSubQuery");

    const events = await db
      .select({
        ...getTableColumns(Event),
        numAttended: eventsSubQuery.numAttended,
      })
      .from(Event)
      .leftJoin(EventAttendee, eq(Event.id, EventAttendee.eventId))
      .leftJoin(Member, eq(EventAttendee.memberId, Member.id))
      .leftJoin(eventsSubQuery, eq(eventsSubQuery.id, Event.id)) // Add numAttended to each corresponding event
      .where(
        and(eq(Member.userId, ctx.session.user.id), isNull(Event.hackathonId)),
      )
      .orderBy(desc(Event.start_datetime));
    return events;
  }),

  // -------------------- ADMIN DASHBOARD ENDPOINTS --------------------
  getMembers: adminProcedure.query(async () => {
    return await db.query.Member.findMany();
  }),

  getMemberCount: publicProcedure.query(async () => {
    const members = await db.query.Member.findMany();
    return members.length || 0;
  }),

  getDuesPayingMembers: adminProcedure.query(async () => {
    const duesPayingMembers = await db
      .select()
      .from(Member)
      .where(
        exists(
          db
            .select()
            .from(DuesPayment)
            .where(eq(DuesPayment.memberId, Member.id)),
        ),
      );

    return duesPayingMembers;
  }),

  createDuesPayingMember: adminProcedure
    .input(InsertMemberSchema.pick({ id: true }))
    .mutation(async ({ input, ctx }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Member ID is required to update dues paying status!",
          code: "BAD_REQUEST",
        });
      }
      await db.insert(DuesPayment).values({
        memberId: input.id,
        amount: DUES_PAYMENT as number,
        paymentDate: new Date(),
        year: new Date().getFullYear(),
      });

      const member = await db
        .select()
        .from(Member)
        .where(eq(Member.id, input.id));

      await log({
        title: "Dues Status Accredited",
        message: `${member[0]?.firstName} ${member[0]?.lastName} has been accredited dues status.`,
        color: "success_green",
        userId: ctx.session.user.discordUserId,
      });
    }),

  deleteDuesPayingMember: adminProcedure
    .input(InsertMemberSchema.pick({ id: true }))
    .mutation(async ({ input, ctx }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Member ID is required to update dues paying status!",
          code: "BAD_REQUEST",
        });
      }
      await db.delete(DuesPayment).where(eq(DuesPayment.memberId, input.id));

      const member = await db
        .select()
        .from(Member)
        .where(eq(Member.id, input.id));

      await log({
        title: "Dues Status Revoked",
        message: `${member[0]?.firstName} ${member[0]?.lastName} has been revoked of dues status.`,
        color: "uhoh_red",
        userId: ctx.session.user.discordUserId,
      });
    }),

  clearAllDues: adminProcedure.mutation(async ({ ctx }) => {
    await db.delete(DuesPayment);
    await log({
      title: "ALL DUES CLEARED",
      message: `ALL DUES HAVE BEEN CLEARED. THIS ACTION IS REVERSIBLE FOR ONLY 7 DAYS.`,
      color: "uhoh_red",
      userId: ctx.session.user.discordUserId,
    });
  }),

  eventCheckIn: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        eventId: z.string(),
        eventPoints: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const member = await db.query.Member.findFirst({
        where: (t, { eq }) => eq(t.userId, input.userId),
      });

      const event = await db.query.Event.findFirst({
        where: (t, { eq }) => eq(t.id, input.eventId),
      });

      if (!member) {
        return;
      }

      const duesPayingMember = await db.query.DuesPayment.findFirst({
        where: (t, { eq }) => eq(t.memberId, member.id),
      });

      if (event?.dues_paying && !duesPayingMember) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `${member.firstName} ${member.lastName} cannot check into a dues paying event!`,
        });
      }

      const duplicates = await db
        .select()
        .from(EventAttendee)
        .where(
          and(
            eq(EventAttendee.memberId, member.id),
            eq(EventAttendee.eventId, input.eventId),
          ),
        );

      if (duplicates.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `${member.firstName} ${member.lastName} is already checked in for the event`,
        });
      }

      const eventAttendee = {
        memberId: member.id,
        eventId: input.eventId,
      };
      await db.insert(EventAttendee).values(eventAttendee);

      // Increment the points for the member
      await db
        .update(Member)
        .set({
          points: sql`${Member.points} + ${input.eventPoints}`, // Ensure input.eventPoints is parsed as a number
        })
        .where(eq(Member.id, member.id));

      await log({
        title: "User Checked-In",
        message: `${member.firstName} ${member.lastName} has been checked in to event ${event?.name}`,
        color: "success_green",
        userId: ctx.session.user.discordUserId,
      });

      return {
        message: `${member.firstName} ${member.lastName} has been checked in to this event!`,
      };
    }),
} satisfies TRPCRouterRecord;
