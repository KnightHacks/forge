import { TEAM } from "@forge/consts";

import type { TeamRoster } from "./teams-config";
import { getBladeTrpcClient } from "../_lib/blade-trpc";
import { TEAM_DEFINITIONS } from "./teams-config";

// Election-cycle workaround for source role data gaps. Review and update this
// list after every Knight Hacks election so the public team page stays current.
const TEAM_ROLE_OVERRIDES = new Map([
  ["jason sacerio", "Treasurer"],
  ["michael rusu", "Workshop Director"],
  ["chris ho", "Outreach Director"],
  ["christopher ho", "Outreach Director"],
]);

function normalizeName(name: string) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function getExecutiveSortOrder(roleLabel: string) {
  const index = TEAM.CLUB_EXECUTIVE_ROLE_ORDER.findIndex(
    (label) => label === roleLabel,
  );

  return index === -1 ? TEAM.CLUB_EXECUTIVE_ROLE_ORDER.length : index;
}

function applyTeamRoleOverrides(roster: TeamRoster): TeamRoster {
  const nextRoster = TEAM_DEFINITIONS.reduce((next, team) => {
    next[team.slug] = roster[team.slug].map((member) => ({
      ...member,
      teamRole:
        TEAM_ROLE_OVERRIDES.get(normalizeName(member.name)) ?? member.teamRole,
    }));

    return next;
  }, {} as TeamRoster);

  nextRoster.executive.sort((first, second) => {
    const firstOrder = getExecutiveSortOrder(first.teamRole);
    const secondOrder = getExecutiveSortOrder(second.teamRole);

    if (firstOrder !== secondOrder) return firstOrder - secondOrder;

    return first.name.localeCompare(second.name);
  });

  return nextRoster;
}

export async function loadClubTeamRoster(
  bladeUrl: string,
  signal: AbortSignal,
): Promise<TeamRoster> {
  const roster = await getBladeTrpcClient(
    bladeUrl,
  ).guild.getPublicClubTeamRoster.query(undefined, { signal });

  return applyTeamRoleOverrides(roster);
}
