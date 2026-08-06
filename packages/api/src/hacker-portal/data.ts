import { and, asc, eq, isNull } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hackathon,
  HackathonAgreementDefinition,
  HackathonClass,
  HackerAgreementAcceptance,
  HackerAttendee,
  HackerCheckInPass,
  HackerProfile,
  HackerProfileRevision,
} from "@forge/db/schemas/knight-hacks";

import type { WriteDb } from "../utils/db";
import { RESUME_BUCKET_NAME } from "../utils/resume/security";
import { resumeStorageClient } from "../utils/resume/storage";
import { portalFailure } from "./trpc";

export const PUBLIC_HACKATHON_COLUMNS = {
  applicationDeadline: Hackathon.applicationDeadline,
  applicationOpen: Hackathon.applicationOpen,
  applicationUrl: Hackathon.applicationUrl,
  confirmationCapacity: Hackathon.confirmationCapacity,
  confirmationDeadline: Hackathon.confirmationDeadline,
  displayName: Hackathon.displayName,
  endDate: Hackathon.endDate,
  id: Hackathon.id,
  name: Hackathon.name,
  startDate: Hackathon.startDate,
  theme: Hackathon.theme,
  timezone: Hackathon.timezone,
} as const;

export async function requirePortalHackathon(hackathonId: string) {
  const [hackathon] = await db
    .select(PUBLIC_HACKATHON_COLUMNS)
    .from(Hackathon)
    .where(eq(Hackathon.id, hackathonId))
    .limit(1);
  if (!hackathon) {
    portalFailure("FORBIDDEN", "This hacker portal is not available.", {
      trpcCode: "FORBIDDEN",
    });
  }
  return hackathon;
}

export async function loadActiveAgreements(
  hackathonId: string,
  stage?: "application" | "confirmation",
) {
  return db
    .select()
    .from(HackathonAgreementDefinition)
    .where(
      and(
        eq(HackathonAgreementDefinition.hackathonId, hackathonId),
        eq(HackathonAgreementDefinition.active, true),
        stage ? eq(HackathonAgreementDefinition.stage, stage) : undefined,
      ),
    )
    .orderBy(
      asc(HackathonAgreementDefinition.stage),
      asc(HackathonAgreementDefinition.key),
    );
}

export function agreementDto(
  agreement: Awaited<ReturnType<typeof loadActiveAgreements>>[number],
) {
  return {
    content: agreement.legalText,
    contentUrl: agreement.url,
    id: agreement.id,
    key: agreement.key,
    required: agreement.required,
    stage: agreement.stage,
    title: agreement.title,
    version: agreement.version,
  };
}

export const PROFILE_COLUMNS = {
  country: HackerProfile.country,
  discordUser: HackerProfile.discordUser,
  dob: HackerProfile.dob,
  email: HackerProfile.email,
  firstName: HackerProfile.firstName,
  foodAllergies: HackerProfile.foodAllergies,
  gender: HackerProfile.gender,
  githubProfileUrl: HackerProfile.githubProfileUrl,
  gradDate: HackerProfile.gradDate,
  id: HackerProfile.id,
  lastName: HackerProfile.lastName,
  levelOfStudy: HackerProfile.levelOfStudy,
  linkedinProfileUrl: HackerProfile.linkedinProfileUrl,
  major: HackerProfile.major,
  phoneNumber: HackerProfile.phoneNumber,
  raceOrEthnicity: HackerProfile.raceOrEthnicity,
  resumeUrl: HackerProfile.resumeUrl,
  revision: HackerProfile.revision,
  school: HackerProfile.school,
  shirtSize: HackerProfile.shirtSize,
  updatedAt: HackerProfile.updatedAt,
  userId: HackerProfile.userId,
  websiteUrl: HackerProfile.websiteUrl,
} as const;

export type ParticipantProfileRow = Awaited<
  ReturnType<typeof loadParticipantProfile>
>;

export async function loadParticipantProfile(userId: string) {
  const [profile] = await db
    .select(PROFILE_COLUMNS)
    .from(HackerProfile)
    .where(eq(HackerProfile.userId, userId))
    .limit(1);
  return profile ?? null;
}

export function profileDto(profile: NonNullable<ParticipantProfileRow>) {
  return {
    country: profile.country,
    discordUser: profile.discordUser,
    dob: profile.dob,
    email: profile.email,
    firstName: profile.firstName,
    foodAllergies: profile.foodAllergies,
    gender: profile.gender,
    githubProfileUrl: profile.githubProfileUrl,
    gradDate: profile.gradDate,
    lastName: profile.lastName,
    levelOfStudy: profile.levelOfStudy,
    linkedinProfileUrl: profile.linkedinProfileUrl,
    major: profile.major,
    phoneNumber: profile.phoneNumber,
    raceOrEthnicity: profile.raceOrEthnicity,
    revision: profile.revision,
    school: profile.school,
    shirtSize: profile.shirtSize,
    websiteUrl: profile.websiteUrl,
  };
}

export async function loadParticipantApplication(
  userId: string,
  hackathonId: string,
  executor: WriteDb = db,
) {
  const [application] = await executor
    .select({
      attendeeId: HackerAttendee.id,
      checkedInAt: HackerAttendee.checkedInAt,
      classId: HackerAttendee.classId,
      className: HackathonClass.name,
      confirmedAt: HackerAttendee.timeConfirmed,
      firstTime: HackerAttendee.isFirstTime,
      hackerId: HackerAttendee.hackerId,
      isVip: HackerAttendee.isVip,
      profileId: HackerAttendee.profileId,
      profileRevision: HackerProfileRevision.revision,
      profileRevisionId: HackerAttendee.profileRevisionId,
      status: HackerAttendee.status,
      submittedAt: HackerAttendee.timeApplied,
      survey1: HackerAttendee.survey1,
      survey2: HackerAttendee.survey2,
    })
    .from(HackerAttendee)
    .innerJoin(HackerProfile, eq(HackerProfile.id, HackerAttendee.profileId))
    .innerJoin(
      HackerProfileRevision,
      eq(HackerProfileRevision.id, HackerAttendee.profileRevisionId),
    )
    .leftJoin(
      HackathonClass,
      and(
        eq(HackathonClass.id, HackerAttendee.classId),
        eq(HackathonClass.hackathonId, HackerAttendee.hackathonId),
      ),
    )
    .where(
      and(
        eq(HackerProfile.userId, userId),
        eq(HackerAttendee.hackathonId, hackathonId),
      ),
    )
    .limit(1);
  return application ?? null;
}

export function applicationDto(
  application: NonNullable<
    Awaited<ReturnType<typeof loadParticipantApplication>>
  >,
) {
  return {
    checkedInAt: application.checkedInAt?.toISOString() ?? null,
    classId: application.classId,
    className: application.className,
    confirmedAt: application.confirmedAt?.toISOString() ?? null,
    firstTime: application.firstTime,
    isVip: application.isVip,
    profileRevision: application.profileRevision,
    status: application.status,
    submittedAt: application.submittedAt.toISOString(),
    survey1: application.survey1,
    survey2: application.survey2,
  };
}

export async function loadAgreementAcceptances(attendeeId: string) {
  return db
    .select({
      accepted: HackerAgreementAcceptance.accepted,
      acceptedAt: HackerAgreementAcceptance.acceptedAt,
      definitionId: HackerAgreementAcceptance.agreementDefinitionId,
    })
    .from(HackerAgreementAcceptance)
    .innerJoin(
      HackathonAgreementDefinition,
      eq(
        HackathonAgreementDefinition.id,
        HackerAgreementAcceptance.agreementDefinitionId,
      ),
    )
    .where(eq(HackerAgreementAcceptance.attendeeId, attendeeId));
}

export function agreementAcceptanceDto(
  acceptance: Awaited<ReturnType<typeof loadAgreementAcceptances>>[number],
) {
  return {
    accepted: acceptance.accepted,
    acceptedAt: acceptance.acceptedAt?.toISOString() ?? null,
    definitionId: acceptance.definitionId,
  };
}

export async function loadResumeMetadata(resumeUrl: string | null | undefined) {
  if (!resumeUrl) return null;
  try {
    const stat = await resumeStorageClient.statObject(
      RESUME_BUCKET_NAME,
      resumeUrl,
    );
    return {
      fileName: "Resume.pdf",
      size: stat.size || null,
      updatedAt: stat.lastModified.toISOString(),
    };
  } catch {
    return {
      fileName: "Resume.pdf",
      size: null,
      updatedAt: new Date(0).toISOString(),
    };
  }
}

export async function revokeActivePasses(
  executor: WriteDb,
  attendeeId: string,
  now: Date,
) {
  await executor
    .update(HackerCheckInPass)
    .set({ revokedAt: now })
    .where(
      and(
        eq(HackerCheckInPass.attendeeId, attendeeId),
        isNull(HackerCheckInPass.revokedAt),
      ),
    );
}
