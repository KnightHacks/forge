import { getBladeTrpcClient } from "./blade-trpc";

export interface TeamCascadeMember {
  id: string;
  name: string;
  teamRole: string;
  imageUrl: string | null;
  linkedinUrl: string | null;
  color: string | null;
}

interface PublicClubTeamRoster {
  executive: TeamCascadeMember[];
  directors: TeamCascadeMember[];
  hackathon: TeamCascadeMember[];
}

export type TeamCascadeRole = "Officer" | "Director" | "Organizer";

export interface TeamCascadeGroup {
  roleLabel: TeamCascadeRole;
  members: TeamCascadeMember[];
}

const teamCascadeRosterGroups = [
  ["Officer", "executive"],
  ["Director", "directors"],
  ["Organizer", "hackathon"],
] as const satisfies readonly (readonly [
  TeamCascadeRole,
  keyof PublicClubTeamRoster,
])[];

export async function loadTeamCascadeGroups(
  bladeUrl: string,
  signal: AbortSignal,
): Promise<TeamCascadeGroup[]> {
  const roster = (await getBladeTrpcClient(
    bladeUrl,
  ).guild.getPublicClubTeamRoster.query(undefined, {
    signal,
  })) as PublicClubTeamRoster;

  return teamCascadeRosterGroups.map(([roleLabel, rosterKey]) => ({
    roleLabel,
    members: roster[rosterKey],
  }));
}
