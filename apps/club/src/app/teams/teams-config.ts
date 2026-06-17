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
