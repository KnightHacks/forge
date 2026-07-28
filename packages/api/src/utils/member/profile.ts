import { TRPCError } from "@trpc/server";

import type { Session } from "@forge/auth/server";
import type { InsertMember } from "@forge/db/schemas/knight-hacks";
import type { MemberInput } from "@forge/validators";
import { eq } from "@forge/db";
import { Member } from "@forge/db/schemas/knight-hacks";
import { calculateMemberAge } from "@forge/validators";

import type { WriteDb } from "../db";
import { createEmploymentHistory } from "../career/employment";
import { isUniqueViolation } from "../db";
import { normalizeProfilePictureObjectNameForPersistence } from "../profile-picture/storage";
import { normalizeResumeObjectNameForPersistence } from "../resume/storage";

export async function createMemberProfile({
  database,
  input,
  session,
}: {
  database: WriteDb;
  input: MemberInput;
  session: Session;
}) {
  const existingMember = await database.query.Member.findFirst({
    where: eq(Member.userId, session.user.id),
    columns: { id: true },
  });

  if (existingMember) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You already have a Knight Hacks member profile.",
    });
  }

  const values: InsertMember = {
    firstName: input.firstName,
    lastName: input.lastName,
    userId: session.user.id,
    discordUser: session.user.name,
    age: calculateMemberAge(input.dob),
    email: input.email,
    phoneNumber: input.phoneNumber,
    school: input.school,
    levelOfStudy: input.levelOfStudy,
    major: input.major,
    gender: input.gender,
    raceOrEthnicity: input.raceOrEthnicity,
    guildProfileVisible: input.guildProfileVisible,
    guildResumeVisible: input.guildResumeVisible,
    guildOpportunityStatuses: input.guildOpportunityStatuses,
    tagline: input.tagline,
    about: input.about,
    profilePictureUrl: normalizeProfilePictureObjectNameForPersistence(
      input.profilePictureUrl,
      session.user.id,
    ),
    shirtSize: input.shirtSize,
    githubProfileUrl: input.githubProfileUrl,
    linkedinProfileUrl: input.linkedinProfileUrl,
    websiteUrl: input.websiteUrl,
    resumeUrl: await normalizeResumeObjectNameForPersistence(
      input.resumeUrl,
      session.user.id,
    ),
    dob: input.dob,
    gradDate: input.gradDate,
    currentCityKey: input.currentCityKey,
    guildLocationVisible: input.guildLocationVisible,
  };

  try {
    const [member] = await database.insert(Member).values(values).returning();

    if (!member) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Member profile could not be created.",
      });
    }

    await createEmploymentHistory({
      database,
      employmentHistory: input.employmentHistory,
      memberId: member.id,
      userId: session.user.id,
    });

    return member;
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
}
