// The team list used to be `TEAM.CLUB_TEAM_DEFINITIONS`, compiled into this
// static export. It is officer-managed data now, so it arrives alongside the
// roster from Blade instead: this app builds with `output: "export"` and cannot
// reach the database, and a team added, renamed, or reordered in Blade must not
// need a Club redeploy to show up here.

export interface TeamDefinition {
  slug: string;
  label: string;
  heading: string;
}

export type TeamSlug = string;

export interface TeamMember {
  id: string;
  name: string;
  teamRole: string;
  imageUrl: string | null;
  linkedinUrl: string | null;
  color: string | null;
}

export interface TeamRoster {
  teams: TeamDefinition[];
  members: Record<TeamSlug, TeamMember[]>;
}

export function createEmptyRoster(): TeamRoster {
  return { teams: [], members: {} };
}

function getMemberProfileId(member: TeamMember) {
  return member.id.slice(member.id.indexOf("-") + 1);
}

export function countUniqueTeamMembers(roster: TeamRoster) {
  const uniqueMemberIds = new Set<string>();

  for (const team of roster.teams) {
    for (const member of roster.members[team.slug] ?? []) {
      uniqueMemberIds.add(getMemberProfileId(member));
    }
  }

  return uniqueMemberIds.size;
}
