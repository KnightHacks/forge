import { TEAM } from "@forge/consts";

export const TEAM_DEFINITIONS = TEAM.CLUB_TEAM_DEFINITIONS;

export type TeamSlug = TEAM.ClubTeamSlug;

export interface TeamMember {
  id: string;
  name: string;
  teamRole: string;
  imageUrl: string | null;
  linkedinUrl: string | null;
  color: string | null;
}

export type TeamRoster = Record<TeamSlug, TeamMember[]>;

export function createEmptyRoster(): TeamRoster {
  return TEAM_DEFINITIONS.reduce((roster, team) => {
    roster[team.slug] = [];
    return roster;
  }, {} as TeamRoster);
}

function getMemberProfileId(member: TeamMember) {
  return member.id.slice(member.id.indexOf("-") + 1);
}

export function countUniqueTeamMembers(roster: TeamRoster) {
  const uniqueMemberIds = new Set<string>();

  for (const team of TEAM_DEFINITIONS) {
    for (const member of roster[team.slug]) {
      uniqueMemberIds.add(getMemberProfileId(member));
    }
  }

  return uniqueMemberIds.size;
}
