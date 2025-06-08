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
import { Session } from "@forge/db/schemas/auth";
import {
  DuesPayment,
  Event,
  EventAttendee,
  InsertMemberSchema,
  Member,
} from "@forge/db/schemas/knight-hacks";

import { env } from "../env";
import { minioClient } from "../minio/minio-client";
import { adminProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { log } from "../utils";

const GUILD_PROFILE_PICTURES_BUCKET_NAME = "guild-profile-pictures";

export const memberRouter = {
  createMember: protectedProcedure
    .input(
      InsertMemberSchema.omit({
        id: true,
        userId: true,
        age: true,
        discordUser: true,
        points: true,
        dateCreated: true,
        timeCreated: true,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.session.user.id;
        const existingMember = await db
          .select({ id: Member.id })
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
            { "Content-Type": "image/png" },
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
        userId: ctx.session.user.id,
        discordUser: ctx.session.user.name ?? "",
        age: newAge,
        phoneNumber: input.phoneNumber === "" ? null : input.phoneNumber,
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
        points: true,
        dateCreated: true,
        timeCreated: true,
        id: true,
      }).partial(),
    )
    .mutation(async ({ input, ctx }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Member ID is required to update a member!",
          code: "BAD_REQUEST",
        });
      }

      const { id, dob, phoneNumber, ...updateData } = input;

      const member = await db.query.Member.findFirst({
        where: (t, { eq }) => eq(t.id, id),
      });

      if (!memberToUpdate) {
        throw new TRPCError({
          message: "Member not found to update!",
          code: "NOT_FOUND",
        });
      }

      const normalizedPhone = phoneNumber === "" ? null : phoneNumber;
      const resume = input.resumeUrl ?? member.resumeUrl;

      const { dob, ...updateDataFromInput } = input;
      let newAge = memberToUpdate.age;

      if (dob) {
        const today = new Date();
        const birthDate = new Date(dob);
        const hasBirthdayPassed =
          birthDate.getMonth() < today.getMonth() ||
          (birthDate.getMonth() === today.getMonth() &&
            birthDate.getDate() <= today.getDate());
        newAge = hasBirthdayPassed
          ? today.getFullYear() - birthDate.getFullYear()
          : today.getFullYear() - birthDate.getFullYear() - 1;
      }

      const dataToSet: Partial<typeof Member.$inferInsert> = {
        ...updateDataFromInput,
        age: newAge,
      };

      if (dob) {
        dataToSet.dob = dob;
      }
      if (input.phoneNumber !== undefined) {
        dataToSet.phoneNumber =
          input.phoneNumber === "" ? null : input.phoneNumber;
      }
      if (input.resumeUrl !== undefined) {
        dataToSet.resumeUrl = input.resumeUrl;
      } else if (input.resumeUrl === null) {
        dataToSet.resumeUrl = null;
      }

      await db
        .update(Member)
        .set({
          ...updateData,
          resumeUrl: resume,
          dob: dob,
          age: newAge,
          phoneNumber: normalizedPhone,
        })
        .where(eq(Member.userId, ctx.session.user.id));

      const changes = Object.keys(updateDataFromInput).reduce(
        (acc, key) => {
          const typedKey = key as keyof typeof updateDataFromInput;
          const memberTypedKey = key as keyof typeof memberToUpdate;

          if (
            Object.prototype.hasOwnProperty.call(
              memberToUpdate,
              memberTypedKey,
            ) &&
            memberToUpdate[memberTypedKey] !== updateDataFromInput[typedKey]
          ) {
            acc[key] = {
              before: memberToUpdate[memberTypedKey],
              after: updateDataFromInput[typedKey],
            };
          } else if (
            !Object.prototype.hasOwnProperty.call(
              memberToUpdate,
              memberTypedKey,
            ) &&
            updateDataFromInput[typedKey] !== null &&
            updateDataFromInput[typedKey] !== undefined
          ) {
            acc[key] = {
              before: null,
              after: updateDataFromInput[typedKey],
            };
          }
          return acc;
        },
        {} as Record<
          string,
          {
            before: string | number | boolean | null;
            after: string | number | boolean | null | undefined;
          }
        >,
      );

      if ((member.phoneNumber ?? "") !== (normalizedPhone ?? "")) {
        changes.phoneNumber = {
          before: member.phoneNumber,
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
        title: "Member Updated",
        message: `Blade profile for ${member.firstName} ${member.lastName} has been updated.
        \n**Changes:**\n${changesString}`,
        color: "tk_blue",
        userId: ctx.session.user.discordUserId,
      });
    }),

  deleteMember: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const memberToDelete = await db.query.Member.findFirst({
        where: eq(Member.id, input.id),
        columns: { firstName: true, lastName: true },
      });
      if (!memberToDelete) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member to delete not found.",
        });
      }
      await db.delete(Member).where(eq(Member.id, input.id));
      await log({
        title: "Member Deleted",
        message: `Profile for ${memberToDelete.firstName} ${memberToDelete.lastName} (ID: ${input.id}) has been deleted.`,
        color: "uhoh_red",
        userId: ctx.session.user.discordUserId,
      });

      if (ctx.session.user.id) {
        await db.delete(Session).where(eq(Session.userId, ctx.session.user.id));
      }
    }),

  getMember: protectedProcedure.query(async ({ ctx }) => {
    const member = await db.query.Member.findFirst({
      where: eq(Member.userId, ctx.session.user.id),
    });
    if (!member) return null;
    return member;
  }),

  uploadProfilePicture: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileContent: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { fileName, fileContent } = input;

      const base64PrefixMatch = /^data:(image\/[a-zA-Z]+);base64,/.exec(
        fileContent,
      );
      const contentType = base64PrefixMatch
        ? base64PrefixMatch[1]
        : "application/octet-stream";
      const base64Data = fileContent.substring(
        base64PrefixMatch?.[0]?.length ?? 0,
      );

      if (!base64Data) {
        console.error("uploadProfilePicture: Base64 data is missing.");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Base64 data is missing or invalid after stripping prefix.",
        });
      }

      const fileBuffer = Buffer.from(base64Data, "base64");
      const userDirectory = `${ctx.session.user.id}/`;
      const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const objectName = `${userDirectory}${Date.now()}-${safeFileName}`;

      try {
        const bucketExists = await minioClient.bucketExists(
          GUILD_PROFILE_PICTURES_BUCKET_NAME,
        );
        if (!bucketExists) {
          await minioClient.makeBucket(
            GUILD_PROFILE_PICTURES_BUCKET_NAME,
            KNIGHTHACKS_S3_BUCKET_REGION,
          );
        }
      } catch (e) {
        console.error(
          "uploadProfilePicture: Error checking/creating bucket:",
          e,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not ensure Minio bucket.",
        });
      }

      const existingObjects: string[] = [];
      try {
        const stream = minioClient.listObjects(
          GUILD_PROFILE_PICTURES_BUCKET_NAME,
          userDirectory,
          true,
        );
        for await (const obj of stream) {
          if (obj.name) {
            existingObjects.push(obj.name);
          }
        }
      } catch (e) {
        console.warn(
          "uploadProfilePicture: Error listing existing profile pictures, proceeding with upload:",
          e,
        );
      }

      if (existingObjects.length > 0) {
        try {
          await minioClient.removeObjects(
            GUILD_PROFILE_PICTURES_BUCKET_NAME,
            existingObjects,
          );
        } catch (e) {
          console.error(
            "uploadProfilePicture: Error removing existing profile pictures:",
            e,
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not remove existing profile pictures.",
          });
        }
      }

      try {
        await minioClient.putObject(
          GUILD_PROFILE_PICTURES_BUCKET_NAME,
          objectName,
          fileBuffer,
          fileBuffer.length,
          { "Content-Type": contentType },
        );
      } catch (e) {
        console.error(
          "uploadProfilePicture: Error uploading profile picture to Minio:",
          e,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not upload profile picture.",
        });
      }

      const publicUrl = `https://${env.MINIO_ENDPOINT}/${GUILD_PROFILE_PICTURES_BUCKET_NAME}/${objectName}`;

      return { profilePictureUrl: publicUrl };
    }),

  getEvents: protectedProcedure.query(async ({ ctx }) => {
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
      .leftJoin(eventsSubQuery, eq(eventsSubQuery.id, Event.id))
      .where(
        and(eq(Member.userId, ctx.session.user.id), isNull(Event.hackathonId)),
      )
      .orderBy(desc(Event.start_datetime));
    return events;
  }),

  getMembers: adminProcedure.query(
    async () => await db.query.Member.findMany(),
  ),
  getMemberCount: publicProcedure.query(
    async () =>
      (await db.select({ count: count() }).from(Member))[0]?.count ?? 0,
  ),
  getDuesPayingMembers: adminProcedure.query(
    async () =>
      await db
        .select()
        .from(Member)
        .where(
          exists(
            db
              .select()
              .from(DuesPayment)
              .where(eq(DuesPayment.memberId, Member.id)),
          ),
        ),
  ),

  createDuesPayingMember: adminProcedure
    .input(InsertMemberSchema.pick({ id: true }))
    .mutation(async ({ input, ctx }) => {
      if (!input.id)
        throw new TRPCError({
          message: "Member ID is required to update dues paying status!",
          code: "BAD_REQUEST",
        });
      await db.insert(DuesPayment).values({
        memberId: input.id,
        amount: DUES_PAYMENT as number,
        paymentDate: new Date(),
        year: new Date().getFullYear(),
      });
      const member = await db.query.Member.findFirst({
        where: eq(Member.id, input.id),
        columns: { firstName: true, lastName: true },
      });
      await log({
        title: "Dues Status Accredited",
        message: `${member?.firstName} ${member?.lastName} has been accredited dues status.`,
        color: "success_green",
        userId: ctx.session.user.discordUserId,
      });
    }),

  deleteDuesPayingMember: adminProcedure
    .input(InsertMemberSchema.pick({ id: true }))
    .mutation(async ({ input, ctx }) => {
      if (!input.id)
        throw new TRPCError({
          message: "Member ID is required to update dues paying status!",
          code: "BAD_REQUEST",
        });
      await db.delete(DuesPayment).where(eq(DuesPayment.memberId, input.id));
      const member = await db.query.Member.findFirst({
        where: eq(Member.id, input.id),
        columns: { firstName: true, lastName: true },
      });
      await log({
        title: "Dues Status Revoked",
        message: `${member?.firstName} ${member?.lastName} has been revoked of dues status.`,
        color: "uhoh_red",
        userId: ctx.session.user.discordUserId,
      });
    }),

  clearAllDues: adminProcedure.mutation(async ({ ctx }) => {
    await db.delete(DuesPayment);
    await log({
      title: "ALL DUES CLEARED",
      message:
        "ALL DUES HAVE BEEN CLEARED. THIS ACTION IS REVERSIBLE FOR ONLY 7 DAYS.",
      color: "uhoh_red",
      userId: ctx.session.user.discordUserId,
    });
  }),

  eventCheckIn: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        eventId: z.string().uuid(),
        eventPoints: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const member = await db.query.Member.findFirst({
        where: eq(Member.userId, input.userId),
      });
      if (!member)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Member with User ID ${input.userId} not found.`,
        });
      const event = await db.query.Event.findFirst({
        where: eq(Event.id, input.eventId),
      });
      if (!event)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Event with ID ${input.eventId} not found.`,
        });
      if (event.dues_paying) {
        const duesPayingMember = await db.query.DuesPayment.findFirst({
          where: eq(DuesPayment.memberId, member.id),
        });
        if (!duesPayingMember)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: `${member.firstName} ${member.lastName} cannot check into a dues-paying event without paying dues.`,
          });
      }
      const duplicates = await db
        .select({ id: EventAttendee.id })
        .from(EventAttendee)
        .where(
          and(
            eq(EventAttendee.memberId, member.id),
            eq(EventAttendee.eventId, input.eventId),
          ),
        );
      if (duplicates.length > 0)
        throw new TRPCError({
          code: "CONFLICT",
          message: `${member.firstName} ${member.lastName} is already checked in for the event.`,
        });
      await db
        .insert(EventAttendee)
        .values({ memberId: member.id, eventId: input.eventId });
      await db
        .update(Member)
        .set({ points: sql`${Member.points} + ${input.eventPoints}` })
        .where(eq(Member.id, member.id));
      await log({
        title: "User Checked-In",
        message: `${member.firstName} ${member.lastName} has been checked in to event ${event.name}.`,
        color: "success_green",
        userId: ctx.session.user.discordUserId,
      });
      return {
        message: `${member.firstName} ${member.lastName} has been checked in to this event!`,
      };
    }),
} satisfies TRPCRouterRecord;
