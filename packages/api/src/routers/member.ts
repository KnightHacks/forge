import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import QRCode from "qrcode";
import { z } from "zod";

import {
  BUCKET_NAME,
  COMPANIES,
  DUES_PAYMENT,
  KNIGHTHACKS_S3_BUCKET_REGION,
} from "@forge/consts/knight-hacks";
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  getTableColumns,
  ilike,
  isNull,
  or,
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
  OtherCompanies,
} from "@forge/db/schemas/knight-hacks";

import { minioClient } from "../minio/minio-client";
import { permProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { controlPerms, log } from "../utils";

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

      //If the company the user entered doesn't already exist, add it to the other companies db
      const company = input.company;
      if (company && !(COMPANIES as readonly string[]).includes(company)) {
        try {
          await db.insert(OtherCompanies).values({
            name: company,
          });
        } catch (error) {
          console.log("Unable to insert company: ", error);
        }
      }

      await db.insert(Member).values({
        ...input,
        userId: ctx.session.user.id,
        discordUser: ctx.session.user.name,
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
        dateCreated: true,
        timeCreated: true,
      }).partial(),
    )
    .mutation(async ({ input, ctx }) => {
      if (!input.id) {
        throw new TRPCError({
          message: "Member ID is required to update a member!",
          code: "BAD_REQUEST",
        });
      }

      const { id, dob, phoneNumber, ...updateDataFromInput } = input;

      const member = await db.query.Member.findFirst({
        where: (t, { eq }) => eq(t.id, id),
      });

      if (!member) {
        throw new TRPCError({
          message: "Member not found to update!",
          code: "NOT_FOUND",
        });
      }

      const normalizedPhone = phoneNumber === "" ? null : phoneNumber;
      const resume = input.resumeUrl ?? member.resumeUrl;

      let newAge = member.age;

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
      }

      const company = input.company;
      if (company && !(COMPANIES as readonly string[]).includes(company)) {
        try {
          await db.insert(OtherCompanies).values({
            name: company,
          });
        } catch (error) {
          console.log("Unable to insert company: ", error);
        }
      }

      await db
        .update(Member)
        .set({
          ...updateDataFromInput,
          resumeUrl: resume,
          dob: dob,
          age: newAge,
          phoneNumber: normalizedPhone,
        })
        .where(eq(Member.userId, ctx.session.user.id));

      const changes = Object.keys(updateDataFromInput).reduce(
        (acc, key) => {
          const typedKey = key as keyof typeof updateDataFromInput;
          const memberTypedKey = key as keyof typeof member;

          if (
            Object.prototype.hasOwnProperty.call(member, memberTypedKey) &&
            member[memberTypedKey] !== updateDataFromInput[typedKey]
          ) {
            acc[key] = {
              before: member[memberTypedKey],
              after: updateDataFromInput[typedKey],
            };
          } else if (
            !Object.prototype.hasOwnProperty.call(member, memberTypedKey) &&
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

  getMembers: permProcedure
    .input(
      z
        .object({
          currentPage: z.number().min(1).optional(),
          pageSize: z.number().min(1).max(100).optional(),
          searchTerm: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      controlPerms.or(["READ_MEMBERS", "CHECKIN_CLUB_EVENT"], ctx);

      if (input?.currentPage && input.pageSize) {
        const offset = (input.currentPage - 1) * input.pageSize;
        const searchPattern = `%${input.searchTerm ?? ""}%`;

        // Build query conditionally
        if (input.searchTerm && input.searchTerm.length > 0) {
          return await db
            .select()
            .from(Member)
            .where(
              or(
                ilike(Member.firstName, searchPattern),
                ilike(Member.lastName, searchPattern),
                ilike(Member.email, searchPattern),
                ilike(Member.discordUser, searchPattern),
                ilike(Member.company, searchPattern),
              ),
            )
            .offset(offset)
            .limit(input.pageSize)
            .orderBy(asc(Member.id));
        }

        return await db
          .select()
          .from(Member)
          .offset(offset)
          .limit(input.pageSize)
          .orderBy(asc(Member.id));
      }

      return await db.query.Member.findMany();
    }),

  getMemberCount: publicProcedure
    .input(
      z
        .object({
          searchTerm: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      if (input?.searchTerm && input.searchTerm.length > 0) {
        const searchPattern = `%${input.searchTerm}%`;
        const result = await db
          .select({ count: count() })
          .from(Member)
          .where(
            or(
              ilike(Member.firstName, searchPattern),
              ilike(Member.lastName, searchPattern),
              ilike(Member.email, searchPattern),
              ilike(Member.discordUser, searchPattern),
              ilike(Member.company, searchPattern),
            ),
          );
        return result[0]?.count ?? 0;
      }
      return (await db.select({ count: count() }).from(Member))[0]?.count ?? 0;
    }),

  giveMemberPoints: permProcedure
    .input(
      z.object({
        id: z.string(),
        amount: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_MEMBERS"], ctx);

      const member = await db.query.Member.findFirst({
        where: eq(Member.id, input.id),
      });

      if (!member) {
        throw new TRPCError({
          message: "Could not find a member",
          code: "BAD_REQUEST",
        });
      }

      await db
        .update(Member)
        .set({ points: sql`${Member.points} + ${input.amount}` })
        .where(eq(Member.id, member.id));

      await log({
        title: `Gave Points`,
        message: `Gave ${input.amount} points to ${member.firstName} ${member.lastName} (Member)`,
        color: "tk_blue",
        userId: ctx.session.user.discordUserId,
      });
    }),

  getDuesPayingMembers: permProcedure.query(async ({ ctx }) => {
    controlPerms.or(["READ_MEMBERS", "READ_CLUB_DATA"], ctx);

    return await db
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
  }),

  getMemberAttendanceCounts: permProcedure.query(async ({ ctx }) => {
    controlPerms.or(["READ_MEMBERS", "READ_CLUB_DATA"], ctx);

    // Get attendance count for each member
    const memberAttendance = await db
      .select({
        memberId: Member.id,
        firstName: Member.firstName,
        lastName: Member.lastName,
        points: Member.points,
        eventsAttended: count(EventAttendee.id),
      })
      .from(Member)
      .leftJoin(EventAttendee, eq(Member.id, EventAttendee.memberId))
      .leftJoin(
        Event,
        and(
          eq(EventAttendee.eventId, Event.id),
          isNull(Event.hackathonId), // Only club events, not hackathon events
        ),
      )
      .groupBy(Member.id, Member.firstName, Member.lastName, Member.points);

    return memberAttendance;
  }),

  createDuesPayingMember: permProcedure
    .input(InsertMemberSchema.pick({ id: true }))
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_MEMBERS", "IS_OFFICER"], ctx);

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

  deleteDuesPayingMember: permProcedure
    .input(InsertMemberSchema.pick({ id: true }))
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_MEMBERS", "IS_OFFICER"], ctx);

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

  clearAllDues: permProcedure.mutation(async ({ ctx }) => {
    controlPerms.or(["IS_OFFICER"], ctx);

    await db.delete(DuesPayment);
    await log({
      title: "ALL DUES CLEARED",
      message:
        "ALL DUES HAVE BEEN CLEARED. THIS ACTION IS REVERSIBLE FOR ONLY 7 DAYS.",
      color: "uhoh_red",
      userId: ctx.session.user.discordUserId,
    });
  }),

  eventCheckIn: permProcedure
    .input(
      z.object({
        userId: z.string(),
        eventId: z.string().uuid(),
        eventPoints: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["CHECKIN_CLUB_EVENT", "CHECKIN_HACK_EVENT"], ctx);

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
