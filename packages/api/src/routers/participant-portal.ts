import type { TRPCBuiltRouter, TRPCRouterBuilder } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import QRCode from "qrcode";
import { z } from "zod";

import { DISCORD } from "@forge/consts";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
  lt,
  sql,
} from "@forge/db";
import { db } from "@forge/db/client";
import {
  Event,
  Hackathon,
  Hacker,
  HackerAttendee,
} from "@forge/db/schemas/knight-hacks";
import { sendHackathonEmail } from "@forge/email";
import { logger } from "@forge/utils";
import * as discord from "@forge/utils/discord";
import { hackerApplicationWireSchema } from "@forge/validators";

import type {
  ParticipantPortalContract,
  ParticipantPortalRouterRecord,
} from "../participant-contract";
import { getUserQRCodePayload } from "../qr-code";
import {
  createResumeObjectName,
  decodeAndValidateResumeDataUrl,
  MAX_RESUME_DATA_URL_LENGTH,
  normalizeOwnedResumeObjectName,
  RESUME_BUCKET_NAME,
} from "../resume-security";
import {
  ensureResumeBucketExists,
  normalizeResumeObjectNameForPersistence,
  removeUnreferencedResumeObjectsForUser,
  resumeStorageClient,
} from "../resume-storage";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { hackerMutationRouter } from "./hackers/mutations";

const hackathonInput = z.object({ hackathonName: z.string().min(1) });

async function requireHackathon(hackathonName: string) {
  const hackathon = await db.query.Hackathon.findFirst({
    where: (table, { eq }) => eq(table.name, hackathonName),
  });

  if (!hackathon) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Hackathon not found." });
  }

  return hackathon;
}

async function getParticipant(hackathonId: string, userId: string) {
  const [participant] = await db
    .select({
      ...getTableColumns(Hacker),
      status: HackerAttendee.status,
      points: HackerAttendee.points,
      timeApplied: HackerAttendee.timeApplied,
      timeConfirmed: HackerAttendee.timeConfirmed,
    })
    .from(Hacker)
    .innerJoin(HackerAttendee, eq(HackerAttendee.hackerId, Hacker.id))
    .where(
      and(
        eq(Hacker.userId, userId),
        eq(HackerAttendee.hackathonId, hackathonId),
      ),
    )
    .limit(1);

  return participant ?? null;
}

const participantPortalRouterImplementation = {
  getHackathon: publicProcedure
    .input(hackathonInput)
    .query(async ({ input }) => requireHackathon(input.hackathonName)),

  getDashboard: protectedProcedure
    .input(hackathonInput)
    .query(async ({ input, ctx }) => {
      const hackathon = await requireHackathon(input.hackathonName);
      const participant = await getParticipant(
        hackathon.id,
        ctx.session.user.id,
      );
      const [{ confirmedCount = 0 } = {}] = await db
        .select({ confirmedCount: count() })
        .from(HackerAttendee)
        .where(
          and(
            eq(HackerAttendee.hackathonId, hackathon.id),
            inArray(HackerAttendee.status, ["confirmed", "checkedin"]),
          ),
        );

      const pastHackathons = await db
        .select({
          id: Hackathon.id,
          name: Hackathon.name,
          displayName: Hackathon.displayName,
          startDate: Hackathon.startDate,
          endDate: Hackathon.endDate,
          status: HackerAttendee.status,
        })
        .from(Hackathon)
        .innerJoin(HackerAttendee, eq(Hackathon.id, HackerAttendee.hackathonId))
        .innerJoin(Hacker, eq(HackerAttendee.hackerId, Hacker.id))
        .where(
          and(
            eq(Hacker.userId, ctx.session.user.id),
            lt(Hackathon.endDate, new Date()),
          ),
        )
        .orderBy(desc(Hackathon.startDate));

      return {
        confirmedCount: Number(confirmedCount),
        hackathon,
        participant,
        pastHackathons,
      };
    }),

  getApplicationContext: protectedProcedure
    .input(hackathonInput)
    .query(async ({ input, ctx }) => {
      const hackathon = await requireHackathon(input.hackathonName);
      const [existingApplication, previousHacker, memberProfile] =
        await Promise.all([
          getParticipant(hackathon.id, ctx.session.user.id),
          db.query.Hacker.findFirst({
            orderBy: (table, { desc }) => [
              desc(table.dateCreated),
              desc(table.timeCreated),
            ],
            where: (table, { eq }) => eq(table.userId, ctx.session.user.id),
          }),
          db.query.Member.findFirst({
            where: (table, { eq }) => eq(table.userId, ctx.session.user.id),
          }),
        ]);

      return {
        existingApplication,
        hackathon,
        memberProfile: memberProfile ?? null,
        previousHacker: previousHacker ?? null,
      };
    }),

  submitApplication: hackerMutationRouter.createHacker,

  updateProfile: protectedProcedure
    .input(
      hackerApplicationWireSchema.extend({
        hackathonName: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { hackathonName, dob, phoneNumber, ...profile } = input;
      const hackathon = await requireHackathon(hackathonName);
      const participant = await getParticipant(
        hackathon.id,
        ctx.session.user.id,
      );

      if (!participant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found.",
        });
      }

      const today = new Date();
      const birthDate = new Date(dob);
      const birthdayPassed =
        birthDate.getMonth() < today.getMonth() ||
        (birthDate.getMonth() === today.getMonth() &&
          birthDate.getDate() <= today.getDate());
      const age =
        today.getFullYear() -
        birthDate.getFullYear() -
        (birthdayPassed ? 0 : 1);
      const normalizedResume =
        profile.resumeUrl === participant.resumeUrl
          ? participant.resumeUrl
          : await normalizeResumeObjectNameForPersistence(
              profile.resumeUrl,
              ctx.session.user.id,
            );

      await db
        .update(Hacker)
        .set({
          ...profile,
          age,
          dob,
          phoneNumber: phoneNumber === "" ? "" : phoneNumber,
          resumeUrl: normalizedResume,
        })
        .where(
          and(
            eq(Hacker.id, participant.id),
            eq(Hacker.userId, ctx.session.user.id),
          ),
        );

      await removeUnreferencedResumeObjectsForUser(ctx.session.user.id);
      return getParticipant(hackathon.id, ctx.session.user.id);
    }),

  uploadResume: protectedProcedure
    .input(
      hackathonInput.extend({
        fileName: z.string().min(1),
        fileContent: z.string().max(MAX_RESUME_DATA_URL_LENGTH),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const hackathon = await requireHackathon(input.hackathonName);
      const now = new Date();
      if (now < hackathon.applicationOpen || now > hackathon.endDate) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Resume uploads are not available for this hackathon.",
        });
      }

      const fileBuffer = decodeAndValidateResumeDataUrl(input.fileContent);
      const filePath = createResumeObjectName(ctx.session.user.id);
      await ensureResumeBucketExists();
      await resumeStorageClient.putObject(
        RESUME_BUCKET_NAME,
        filePath,
        fileBuffer,
        fileBuffer.length,
        { "Content-Type": "application/pdf" },
      );
      return filePath;
    }),

  getResume: protectedProcedure
    .input(hackathonInput)
    .query(async ({ input, ctx }) => {
      const hackathon = await requireHackathon(input.hackathonName);
      const participant = await getParticipant(
        hackathon.id,
        ctx.session.user.id,
      );
      if (!participant) return { url: null };

      const filename = normalizeOwnedResumeObjectName(
        participant.resumeUrl,
        ctx.session.user.id,
      );
      if (!filename) return { url: null };

      try {
        const url = await resumeStorageClient.presignedUrl(
          "GET",
          RESUME_BUCKET_NAME,
          filename,
          60 * 60,
        );
        return { url };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not generate resume URL.",
        });
      }
    }),

  confirmAttendance: protectedProcedure
    .input(hackathonInput)
    .mutation(async ({ input, ctx }) => {
      const result = await db.transaction(async (tx) => {
        await tx.execute(
          sql`select ${Hackathon.id} from ${Hackathon} where ${Hackathon.name} = ${input.hackathonName} for update`,
        );
        const hackathon = await tx.query.Hackathon.findFirst({
          where: (table, { eq }) => eq(table.name, input.hackathonName),
        });
        if (!hackathon) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Hackathon not found.",
          });
        }

        const [participant] = await tx
          .select({
            id: Hacker.id,
            firstName: Hacker.firstName,
            email: Hacker.email,
            status: HackerAttendee.status,
          })
          .from(Hacker)
          .innerJoin(HackerAttendee, eq(HackerAttendee.hackerId, Hacker.id))
          .where(
            and(
              eq(Hacker.userId, ctx.session.user.id),
              eq(HackerAttendee.hackathonId, hackathon.id),
            ),
          )
          .limit(1);

        if (!participant) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Application not found.",
          });
        }
        if (participant.status !== "accepted") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Only accepted hackers can confirm attendance.",
          });
        }
        if (new Date() > hackathon.confirmationDeadline) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "The confirmation deadline has passed.",
          });
        }

        if (hackathon.confirmationCapacity != null) {
          const [{ total = 0 } = {}] = await tx
            .select({ total: count() })
            .from(HackerAttendee)
            .where(
              and(
                eq(HackerAttendee.hackathonId, hackathon.id),
                inArray(HackerAttendee.status, ["confirmed", "checkedin"]),
              ),
            );
          if (Number(total) >= hackathon.confirmationCapacity) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "This hackathon has reached confirmation capacity.",
            });
          }
        }

        await tx
          .update(HackerAttendee)
          .set({ status: "confirmed", timeConfirmed: new Date() })
          .where(
            and(
              eq(HackerAttendee.hackerId, participant.id),
              eq(HackerAttendee.hackathonId, hackathon.id),
            ),
          );

        return { hackathon, participant };
      });

      try {
        await sendHackathonEmail({
          from: "donotreply@knighthacks.org",
          hackathon: {
            applicationBackgroundKey: result.hackathon.applicationBackgroundKey,
            displayName: result.hackathon.displayName,
            emailTemplateKey: result.hackathon.emailTemplateEnabled
              ? result.hackathon.emailTemplateKey
              : null,
            routeName: result.hackathon.name,
            theme: result.hackathon.theme,
          },
          kind: "Confirmation",
          recipient: {
            name: result.participant.firstName,
            to: result.participant.email,
          },
        });
      } catch (error) {
        logger.warn("Failed to send hackathon confirmation email:", error);
      }

      try {
        await discord.log({
          title: `Hacker Confirmed for ${result.hackathon.displayName}`,
          message: `${result.participant.firstName} has confirmed attendance.`,
          color: "success_green",
          userId: ctx.session.user.discordUserId,
        });
      } catch (error) {
        logger.warn("Failed to log hacker confirmation to Discord:", error);
      }

      return { status: "confirmed" as const };
    }),

  withdrawAttendance: protectedProcedure
    .input(hackathonInput)
    .mutation(async ({ input, ctx }) => {
      const hackathon = await requireHackathon(input.hackathonName);
      const participant = await getParticipant(
        hackathon.id,
        ctx.session.user.id,
      );
      if (!participant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found.",
        });
      }
      if (participant.status !== "confirmed") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Only confirmed hackers can withdraw attendance.",
        });
      }

      const [withdrawnParticipant] = await db
        .update(HackerAttendee)
        .set({ status: "withdrawn", timeConfirmed: null })
        .where(
          and(
            eq(HackerAttendee.hackerId, participant.id),
            eq(HackerAttendee.hackathonId, hackathon.id),
            eq(HackerAttendee.status, "confirmed"),
          ),
        )
        .returning({ id: HackerAttendee.id });

      if (!withdrawnParticipant) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Only confirmed hackers can withdraw attendance.",
        });
      }

      return { status: "withdrawn" as const };
    }),

  getQRCode: protectedProcedure
    .input(hackathonInput)
    .query(async ({ input, ctx }) => {
      const hackathon = await requireHackathon(input.hackathonName);
      const participant = await getParticipant(
        hackathon.id,
        ctx.session.user.id,
      );
      if (!participant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found.",
        });
      }
      if (
        participant.status !== "confirmed" &&
        participant.status !== "checkedin"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "The hacker QR code is available after confirmation.",
        });
      }
      return {
        qrCodeUrl: await QRCode.toDataURL(
          getUserQRCodePayload(ctx.session.user.id),
          { type: "image/png" },
        ),
      };
    }),

  getSchedule: protectedProcedure
    .input(hackathonInput)
    .query(async ({ input, ctx }) => {
      const hackathon = await requireHackathon(input.hackathonName);
      const participant = await getParticipant(
        hackathon.id,
        ctx.session.user.id,
      );
      if (participant?.status !== "checkedin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "The event schedule is available after check-in.",
        });
      }

      return db
        .select({
          id: Event.id,
          name: Event.name,
          description: Event.description,
          tag: Event.tag,
          location: Event.location,
          points: Event.points,
          startDateTime: Event.start_datetime,
          endDateTime: Event.end_datetime,
        })
        .from(Event)
        .where(eq(Event.hackathonId, hackathon.id))
        .orderBy(asc(Event.start_datetime));
    }),

  reportIssue: protectedProcedure
    .input(
      hackathonInput.extend({
        description: z.string().trim().min(1).max(2_000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const hackathon = await requireHackathon(input.hackathonName);
      const participant = await getParticipant(
        hackathon.id,
        ctx.session.user.id,
      );
      if (participant?.status !== "checkedin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Issue reporting is available after check-in.",
        });
      }

      await discord.log({
        message: `<@&${DISCORD.OFFICER_ROLE}> [${hackathon.displayName}] ${input.description}`,
        title: "Hackathon Issue",
        color: "uhoh_red",
        userId: ctx.session.user.discordUserId,
      });
      return { submitted: true };
    }),
} satisfies ParticipantPortalContract;

type ParticipantRootTypes =
  typeof createTRPCRouter extends TRPCRouterBuilder<infer TRoot>
    ? TRoot
    : never;

export const participantPortalRouter: TRPCBuiltRouter<
  ParticipantRootTypes,
  ParticipantPortalRouterRecord
> = createTRPCRouter(
  participantPortalRouterImplementation,
) as unknown as TRPCBuiltRouter<
  ParticipantRootTypes,
  ParticipantPortalRouterRecord
>;
