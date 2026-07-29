import type {
  ClubRoleClassification,
  ClubTeamConfig,
  ClubTeamDefinition,
} from "../../utils/guild/club-team-config";
import { createClubTeamConfig } from "../../utils/guild/club-team-config";

/**
 * The club roster configuration exactly as migration `0026` backfills it.
 *
 * Tests use this rather than a minimal invented config so a behavior change is
 * measured against the arrangement that is actually deployed — the one the
 * roster and the Guild badge were verified against before the constants moved
 * into the database.
 *
 * Role IDs are synthetic and derived from the role name, purely so failures are
 * readable. Nothing under test parses them.
 */
const CLUB_TEAM_FIXTURE_TEAMS: ClubTeamDefinition[] = [
  {
    slug: "executive",
    label: "Executive",
    heading: "Executive Officers",
    kind: "executive",
    displayOrder: 0,
  },
  {
    slug: "directors",
    label: "Directors",
    heading: "Directors",
    kind: "director",
    displayOrder: 1,
  },
  {
    slug: "hackathon",
    label: "Hackathon",
    heading: "Hackathon Team",
    kind: "team",
    displayOrder: 2,
  },
  {
    slug: "sponsorship",
    label: "Sponsorship",
    heading: "Sponsorship Team",
    kind: "team",
    displayOrder: 3,
  },
  {
    slug: "workshop",
    label: "Workshop",
    heading: "Workshop Team",
    kind: "team",
    displayOrder: 4,
  },
  {
    slug: "design",
    label: "Design",
    heading: "Design Team",
    kind: "team",
    displayOrder: 5,
  },
  {
    slug: "outreach",
    label: "Outreach",
    heading: "Outreach Team",
    kind: "team",
    displayOrder: 6,
  },
  {
    slug: "development",
    label: "Development",
    heading: "Development Team",
    kind: "team",
    displayOrder: 7,
  },
];

export function clubRoleId(roleName: string) {
  return `role-${roleName.toLowerCase().replaceAll(" ", "-")}`;
}

const ROLE_SEED: Omit<ClubRoleClassification, "roleId">[] = [
  {
    roleName: "President",
    kind: "executive",
    rank: 0,
    teamSlug: null,
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Vice President",
    kind: "executive",
    rank: 1,
    teamSlug: null,
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Treasurer",
    kind: "executive",
    rank: 2,
    teamSlug: null,
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Secretary",
    kind: "executive",
    rank: 3,
    teamSlug: null,
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Hack Lead",
    kind: "executive",
    rank: 4,
    teamSlug: "hackathon",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Dev Lead",
    kind: "executive",
    rank: 5,
    teamSlug: "development",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Officers",
    kind: "executive",
    rank: 6,
    teamSlug: null,
    rosterLabel: null,
    calloutLabel: "Officer",
  },
  {
    roleName: "Design Director",
    kind: "director",
    rank: 0,
    teamSlug: "design",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Sponsorship Director",
    kind: "director",
    rank: 1,
    teamSlug: "sponsorship",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Mentorship Director",
    kind: "director",
    rank: 2,
    teamSlug: null,
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Outreach Director",
    kind: "director",
    rank: 3,
    teamSlug: "outreach",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Workshop Director",
    kind: "director",
    rank: 4,
    teamSlug: "workshop",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Directors",
    kind: "director",
    rank: 5,
    teamSlug: null,
    rosterLabel: "Director",
    calloutLabel: "Director",
  },
  {
    roleName: "KH IX Team",
    kind: "team",
    rank: 1,
    teamSlug: "hackathon",
    rosterLabel: null,
    calloutLabel: "Organizer",
  },
  {
    roleName: "Sponsorship Team",
    kind: "team",
    rank: 1,
    teamSlug: "sponsorship",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Workshop Team",
    kind: "team",
    rank: 1,
    teamSlug: "workshop",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Design Team",
    kind: "team",
    rank: 1,
    teamSlug: "design",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Outreach Team",
    kind: "team",
    rank: 1,
    teamSlug: "outreach",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Dev Team",
    kind: "team",
    rank: 1,
    teamSlug: "development",
    rosterLabel: null,
    calloutLabel: null,
  },
];

const CLUB_TEAM_FIXTURE_ROLES: ClubRoleClassification[] = ROLE_SEED.map(
  (role) => ({ ...role, roleId: clubRoleId(role.roleName) }),
);

/**
 * The deployed configuration, optionally with a team or a role rewritten.
 *
 * The overrides exist for the renaming tests: a Discord role or a team getting
 * a new display name is the scenario this whole change is about, and expressing
 * it as a transform keeps those tests from mutating a shared fixture.
 */
export function createClubTeamConfigFixture(overrides?: {
  team?: (team: ClubTeamDefinition) => ClubTeamDefinition;
  role?: (role: ClubRoleClassification) => ClubRoleClassification;
}): ClubTeamConfig {
  return createClubTeamConfig(
    CLUB_TEAM_FIXTURE_TEAMS.map((team) => ({
      ...(overrides?.team?.(team) ?? team),
    })),
    CLUB_TEAM_FIXTURE_ROLES.map((role) => ({
      ...(overrides?.role?.(role) ?? role),
    })),
  );
}
