export const TEAM_DEFINITIONS = [
  {
    slug: "executive",
    label: "Executive",
    heading: "Executive Officers",
  },
  {
    slug: "directors",
    label: "Directors",
    heading: "Directors",
  },
  {
    slug: "hackathon",
    label: "Hackathon",
    heading: "Hackathon Team",
  },
  {
    slug: "sponsorship",
    label: "Sponsorship",
    heading: "Sponsorship Team",
  },
  {
    slug: "workshop",
    label: "Workshop",
    heading: "Workshop Team",
  },
  {
    slug: "design",
    label: "Design",
    heading: "Design Team",
  },
  {
    slug: "outreach",
    label: "Outreach",
    heading: "Outreach Team",
  },
  {
    slug: "development",
    label: "Development",
    heading: "Development Team",
  },
] as const;

export type TeamSlug = (typeof TEAM_DEFINITIONS)[number]["slug"];

export interface TeamMember {
  id: string;
  name: string;
  teamRole: string;
  quote: string | null;
  imageUrl: string | null;
  color: string | null;
}

export type TeamRoster = Record<TeamSlug, TeamMember[]>;

export function createEmptyRoster(): TeamRoster {
  return TEAM_DEFINITIONS.reduce((roster, team) => {
    roster[team.slug] = [];
    return roster;
  }, {} as TeamRoster);
}
