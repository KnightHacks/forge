import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import type {
  InsertMember,
  SelectMember,
} from "@forge/db/schemas/knight-hacks";
import { and, eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, User } from "@forge/db/schemas/auth";
import { FormResponse, Member } from "@forge/db/schemas/knight-hacks";
import {
  calculateMemberAge,
  MEMBER_SIGNUP_FORM_ID,
  memberResponseDataFromInput,
  memberSchema,
  memberUpdateSchema,
} from "@forge/validators";

import { protectedProcedure } from "../trpc";
import { codeOwnedFormConfigs } from "../utils/forms/config";
import { updateResponse } from "../utils/forms/manager";
import {
  createMemberProfile,
  isUniqueViolation,
} from "../utils/member/profile";
import { removeProfilePictureObjectsForUser } from "../utils/profile-picture/storage";
import { removeUnreferencedResumeObjectsForUser } from "../utils/resume/storage";

function getCodeOfConductAccepted(responseData: unknown) {
  if (
    typeof responseData === "object" &&
    responseData !== null &&
    "codeOfConductAccepted" in responseData &&
    typeof responseData.codeOfConductAccepted === "boolean"
  ) {
    return responseData.codeOfConductAccepted;
  }

  return true;
}

function memberInputFromRow(member: SelectMember) {
  return {
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phoneNumber: member.phoneNumber,
    dob: member.dob,
    school: member.school,
    levelOfStudy: member.levelOfStudy,
    major: member.major,
    gender: member.gender,
    raceOrEthnicity: member.raceOrEthnicity,
    shirtSize: member.shirtSize,
    gradDate: member.gradDate,
    company: member.company,
    githubProfileUrl: member.githubProfileUrl,
    linkedinProfileUrl: member.linkedinProfileUrl,
    websiteUrl: member.websiteUrl,
    profilePictureUrl: member.profilePictureUrl,
    resumeUrl: member.resumeUrl,
    tagline: member.tagline,
    about: member.about,
    guildProfileVisible: member.guildProfileVisible,
  };
}

export const memberRouter = {
  getMember: protectedProcedure.query(async ({ ctx }) => {
    const member = await db.query.Member.findFirst({
      where: eq(Member.userId, ctx.session.user.id),
    });

    return member ?? null;
  }),

  createMember: protectedProcedure
    .input(memberSchema)
    .mutation(async ({ ctx, input }) => {
      return await createMemberProfile({
        database: db,
        input,
        session: ctx.session,
      });
    }),

  updateMember: protectedProcedure
    .input(memberUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      return await db.transaction(async (tx) => {
        const existingMember = await tx.query.Member.findFirst({
          where: eq(Member.userId, ctx.session.user.id),
        });

        if (!existingMember) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Member profile does not exist.",
          });
        }

        const values = {
          firstName: input.firstName,
          lastName: input.lastName,
          discordUser: ctx.session.user.name,
          age: calculateMemberAge(input.dob),
          email: input.email,
          phoneNumber: input.phoneNumber,
          school: input.school,
          levelOfStudy: input.levelOfStudy,
          major: input.major,
          gender: input.gender,
          raceOrEthnicity: input.raceOrEthnicity,
          guildProfileVisible: input.guildProfileVisible,
          tagline: input.tagline,
          about: input.about,
          shirtSize: input.shirtSize,
          githubProfileUrl: input.githubProfileUrl,
          linkedinProfileUrl: input.linkedinProfileUrl,
          websiteUrl: input.websiteUrl,
          dob: input.dob,
          gradDate: input.gradDate,
          company: input.company,
        } satisfies Partial<InsertMember>;

        let updatedMember: SelectMember;

        try {
          const [member] = await tx
            .update(Member)
            .set(values)
            .where(eq(Member.userId, ctx.session.user.id))
            .returning();

          if (!member) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Member profile could not be updated.",
            });
          }

          updatedMember = member;
        } catch (error) {
          if (error instanceof TRPCError) throw error;

          if (isUniqueViolation(error)) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "A member profile with that email or phone number already exists.",
            });
          }

          throw error;
        }

        const existingResponse = await tx.query.FormResponse.findFirst({
          where: and(
            eq(FormResponse.userId, ctx.session.user.id),
            eq(FormResponse.form, MEMBER_SIGNUP_FORM_ID),
          ),
          columns: {
            responseData: true,
          },
        });
        const codeOfConductAccepted = getCodeOfConductAccepted(
          existingResponse?.responseData,
        );

        await updateResponse({
          codeOwnedForms: codeOwnedFormConfigs,
          database: tx,
          enforceAllowEdit: false,
          input: {
            form: MEMBER_SIGNUP_FORM_ID,
            responseData: memberResponseDataFromInput(
              memberInputFromRow(updatedMember),
              { codeOfConductAccepted },
            ),
            upsert: true,
          },
          session: ctx.session,
        });

        return updatedMember;
      });
    }),

  deleteMember: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    try {
      await db.transaction(async (tx) => {
        const existingMember = await tx.query.Member.findFirst({
          where: eq(Member.userId, userId),
          columns: {
            id: true,
          },
        });

        if (!existingMember) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Member profile does not exist.",
          });
        }

        await tx
          .delete(FormResponse)
          .where(
            and(
              eq(FormResponse.userId, userId),
              eq(FormResponse.form, MEMBER_SIGNUP_FORM_ID),
            ),
          );
        await tx.delete(Member).where(eq(Member.userId, userId));
        await tx.delete(Permissions).where(eq(Permissions.userId, userId));

        const [deletedUser] = await tx
          .delete(User)
          .where(eq(User.id, userId))
          .returning({ id: User.id });

        if (!deletedUser) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Member account could not be deleted.",
          });
        }
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Member profile could not be deleted.",
      });
    }

    await Promise.all([
      removeProfilePictureObjectsForUser(userId),
      removeUnreferencedResumeObjectsForUser(userId),
    ]);

    return { deleted: true };
  }),
} satisfies TRPCRouterRecord;
