import { TEAM as TEAM_CONSTS } from "@forge/consts";

export interface GuildRoleAssignment {
  color: string | null;
  name: string;
}

export interface GuildRoleCallout {
  category: "officer" | "director" | "team";
  color: string | null;
  label: string;
}

interface RankedCallout extends GuildRoleCallout {
  priority: number;
  tier: number;
}

const executiveRoleOrder = [
  ...TEAM_CONSTS.CLUB_EXECUTIVE_ROLE_ORDER,
  TEAM_CONSTS.CLUB_AGGREGATE_EXECUTIVE_ROLE,
] as const;

const directorRoleOrder = [
  ...TEAM_CONSTS.CLUB_DIRECTOR_ROLE_ORDER.filter((role) => role !== "Director"),
  TEAM_CONSTS.CLUB_AGGREGATE_DIRECTOR_ROLE,
] as const;

const teamRoleConfigs = Object.values(TEAM_CONSTS.CLUB_TEAM_ROLE_CONFIG);

function rankRole(role: GuildRoleAssignment): RankedCallout | null {
  const executiveIndex = (executiveRoleOrder as readonly string[]).indexOf(
    role.name,
  );
  if (executiveIndex !== -1) {
    return {
      category: "officer",
      color: role.color,
      label:
        role.name === TEAM_CONSTS.CLUB_AGGREGATE_EXECUTIVE_ROLE
          ? "Officer"
          : role.name,
      priority: executiveIndex,
      tier: 0,
    };
  }

  const directorIndex = (directorRoleOrder as readonly string[]).indexOf(
    role.name,
  );
  if (directorIndex !== -1) {
    return {
      category: "director",
      color: role.color,
      label:
        role.name === TEAM_CONSTS.CLUB_AGGREGATE_DIRECTOR_ROLE
          ? "Director"
          : role.name,
      priority: directorIndex,
      tier: 1,
    };
  }

  const teamIndex = teamRoleConfigs.findIndex(
    (config) => config.teamRoleName === role.name,
  );
  const teamConfig = teamRoleConfigs[teamIndex] as
    | (typeof teamRoleConfigs)[number]
    | undefined;
  if (teamIndex !== -1 && teamConfig) {
    return {
      category: "team",
      color: role.color,
      label:
        teamConfig.label === "Hackathon"
          ? "Organizer"
          : `${teamConfig.label} Team`,
      priority: teamIndex,
      tier: 2,
    };
  }

  return null;
}

export function getGuildRoleCallout(
  roles: readonly GuildRoleAssignment[],
): GuildRoleCallout | null {
  const [highest] = roles
    .map(rankRole)
    .filter((role): role is RankedCallout => role !== null)
    .sort(
      (first, second) =>
        first.tier - second.tier || first.priority - second.priority,
    );

  if (!highest) return null;

  return {
    category: highest.category,
    color: highest.color,
    label: highest.label,
  };
}

export type ClubTeamRoleConfig =
  (typeof TEAM_CONSTS.CLUB_TEAM_ROLE_CONFIG)[keyof typeof TEAM_CONSTS.CLUB_TEAM_ROLE_CONFIG];
