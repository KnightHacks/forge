import { TRPCError } from "@trpc/server";

import type { db as forgeDb } from "@forge/db/client";
import type {
  InsertMember,
  SelectMember,
} from "@forge/db/schemas/knight-hacks";
import type { MemberUpdateInput } from "@forge/validators";
import { and, eq } from "@forge/db";
import { FormResponse, Member } from "@forge/db/schemas/knight-hacks";
import {
  calculateMemberAge,
  MEMBER_SIGNUP_FORM_ID,
  memberResponseDataFromInput,
} from "@forge/validators";

import { codeOwnedFormConfigs } from "../forms/config";
import { updateResponse } from "../forms/manager";
import { isUniqueViolation } from "./profile";

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

export async function updateMemberProfile({
  database,
  discordUser,
  input,
  memberId,
  points,
  userId,
}: {
  database: typeof forgeDb;
  discordUser?: string | null;
  input: MemberUpdateInput;
  memberId?: string;
  points?: number;
  userId: string;
}) {
  return await database.transaction(async (tx) => {
    const existingMember = await tx.query.Member.findFirst({
      where: memberId ? eq(Member.id, memberId) : eq(Member.userId, userId),
    });

    if (existingMember?.userId !== userId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Member profile does not exist.",
      });
    }

    const values = {
      firstName: input.firstName,
      lastName: input.lastName,
      discordUser: discordUser ?? existingMember.discordUser,
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
      ...(points === undefined ? {} : { points }),
    } satisfies Partial<InsertMember>;

    let updatedMember: SelectMember;
    try {
      const [member] = await tx
        .update(Member)
        .set(values)
        .where(eq(Member.id, existingMember.id))
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
        eq(FormResponse.userId, userId),
        eq(FormResponse.form, MEMBER_SIGNUP_FORM_ID),
      ),
      columns: { responseData: true },
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
      session: { user: { id: userId } },
    });

    return updatedMember;
  });
}
