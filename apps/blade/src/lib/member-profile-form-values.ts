import type { MemberUpdateFormValues } from "@forge/validators";
import { graduationTermYearFromDate } from "@forge/validators";

import type { CurrentMember } from "~/hooks/use-member";

/**
 * The member row as the profile form reads it. The overridden fields are stored
 * nullable but the form always edits them as strings.
 */
export type MemberProfileFormSource = Omit<
  CurrentMember,
  | "alumniConfirmedAt"
  | "currentCityKey"
  | "gender"
  | "guildLocationVisible"
  | "levelOfStudy"
  | "major"
  | "raceOrEthnicity"
  | "school"
  | "shirtSize"
> & {
  gender: string;
  levelOfStudy: string;
  major: string;
  raceOrEthnicity: string;
  school: string;
  shirtSize: string;
};

/**
 * Seeds the member update form. Nullable columns become empty strings so every
 * field stays controlled, and the stored graduation date is split back into the
 * term/year pair the form edits.
 */
export function memberProfileFormDefaults(
  member: MemberProfileFormSource,
): MemberUpdateFormValues {
  const { gradTerm, gradYear } = graduationTermYearFromDate(member.gradDate);

  return {
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phoneNumber: member.phoneNumber ?? "",
    dob: member.dob,
    school: member.school,
    levelOfStudy: member.levelOfStudy,
    major: member.major,
    gender: member.gender,
    raceOrEthnicity: member.raceOrEthnicity,
    shirtSize: member.shirtSize,
    gradTerm,
    gradYear,
    company: member.company ?? "",
    githubProfileUrl: member.githubProfileUrl ?? "",
    linkedinProfileUrl: member.linkedinProfileUrl ?? "",
    websiteUrl: member.websiteUrl ?? "",
    profilePictureUrl: member.profilePictureUrl ?? "",
    resumeUrl: member.resumeUrl ?? "",
    tagline: member.tagline ?? "",
    about: member.about ?? "",
    guildProfileVisible: member.guildProfileVisible,
    guildResumeVisible: member.guildResumeVisible,
    guildOpportunityStatuses: member.guildOpportunityStatuses,
  };
}
