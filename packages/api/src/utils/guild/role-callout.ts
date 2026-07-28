import type { TEAM } from "@forge/consts";

import type { ClubTeamConfig } from "./club-team-config";
import {
  getClubCalloutLabel,
  getClubCalloutPriority,
} from "./club-team-config";

export interface GuildRoleAssignment {
  color: string | null;
  roleId: string;
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

// A role's classification decides both the badge category and how it outranks
// the member's other roles. Officers beat directors beat team members; within a
// tier, the configured rank decides. This used to be three hard-coded name
// arrays that had to be kept in step with the roster's own copies.
const CALLOUT_TIERS: Record<
  TEAM.ClubTeamKind,
  { category: GuildRoleCallout["category"]; tier: number }
> = {
  executive: { category: "officer", tier: 0 },
  director: { category: "director", tier: 1 },
  team: { category: "team", tier: 2 },
};

export function getGuildRoleCallout(
  config: ClubTeamConfig,
  roles: readonly GuildRoleAssignment[],
): GuildRoleCallout | null {
  const [highest] = roles
    .map((role): RankedCallout | null => {
      const classification = config.rolesById.get(role.roleId);

      if (!classification) return null;

      const { category, tier } = CALLOUT_TIERS[classification.kind];

      return {
        category,
        color: role.color,
        label: getClubCalloutLabel(config, classification),
        priority: getClubCalloutPriority(config, classification),
        tier,
      };
    })
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
