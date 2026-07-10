import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@forge/api";

import { getBladeTrpcClient } from "./blade-trpc";

type PublicClubTeamRoster =
  inferRouterOutputs<AppRouter>["guild"]["getPublicClubTeamRoster"];

export type TeamCascadeMember = PublicClubTeamRoster["executive"][number];

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
  const roster = await getBladeTrpcClient(
    bladeUrl,
  ).guild.getPublicClubTeamRoster.query(undefined, {
    signal,
  });

  return teamCascadeRosterGroups.map(([roleLabel, rosterKey]) => ({
    roleLabel,
    members: roster[rosterKey] ?? [],
  }));
}
