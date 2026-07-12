import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@forge/api";

import { getBladeTrpcClient } from "./blade-trpc";

type PublicClubTeamRoster =
  inferRouterOutputs<AppRouter>["guild"]["getPublicClubTeamRoster"];

export type TeamCascadeMember = PublicClubTeamRoster["executive"][number];

export type TeamCascadeRole = "Officer" | "Director" | "Organizer" | "Designer";

export interface TeamCascadeGroup {
  roleLabel: TeamCascadeRole;
  members: TeamCascadeMember[];
}

const featuredDesignerIds = [
  "design-f06cbff5-b5f8-49d5-8a3c-5b40a59dfcc6",
  "design-3a0d6777-2276-4ae8-9281-ace2a26d6c94",
  "design-f56f4444-7962-4090-b937-f31674a6ac7e",
] as const;

const teamCascadeRosterGroups = [
  { roleLabel: "Officer", rosterKey: "executive" },
  { roleLabel: "Director", rosterKey: "directors" },
  { roleLabel: "Organizer", rosterKey: "hackathon" },
  {
    roleLabel: "Designer",
    rosterKey: "design",
    memberIds: featuredDesignerIds,
  },
] as const satisfies readonly {
  roleLabel: TeamCascadeRole;
  rosterKey: keyof PublicClubTeamRoster;
  memberIds?: readonly string[];
}[];

export async function loadTeamCascadeGroups(
  bladeUrl: string,
  signal: AbortSignal,
): Promise<TeamCascadeGroup[]> {
  const roster = await getBladeTrpcClient(
    bladeUrl,
  ).guild.getPublicClubTeamRoster.query(undefined, {
    signal,
  });

  return teamCascadeRosterGroups.map((group) => {
    const members = roster[group.rosterKey];

    return {
      roleLabel: group.roleLabel,
      members:
        "memberIds" in group
          ? members.filter((member) =>
              group.memberIds.some((memberId) => memberId === member.id),
            )
          : members,
    };
  });
}
