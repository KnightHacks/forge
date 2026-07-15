export const TEAMS = [
  {
    team: "Outreach",
    color: "#88fea1",
    director_role: "779845137822908436",
  },
  {
    team: "Design",
    color: "#eaacff",
    director_role: "874028482089349172",
  },
  {
    team: "Development",
    color: "#93ceff",
    director_role: "1082124530077683772",
  },
  {
    team: "Sponsorship",
    color: "#f5f4af",
    director_role: "626815399442513920",
  },
  {
    team: "Workshops",
    color: "#206694",
    director_role: "757002949603098837",
  },
  {
    team: "Projects/Mentorship",
    color: "#3498db",
    director_role: "1244790444626280550",
  },
];

export const CLUB_TEAM_DEFINITIONS = [
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

export type ClubTeamDefinition = (typeof CLUB_TEAM_DEFINITIONS)[number];
export type ClubTeamSlug = ClubTeamDefinition["slug"];

export const CLUB_EXECUTIVE_ROLE_ORDER = [
  "President",
  "Vice President",
  "Treasurer",
  "Secretary",
  "Hack Lead",
  "Dev Lead",
] as const;

export const CLUB_AGGREGATE_EXECUTIVE_ROLE = "Officers" as const;

export const CLUB_DIRECTOR_ROLE_ORDER = [
  "Design Director",
  "Sponsorship Director",
  "Mentorship Director",
  "Outreach Director",
  "Workshop Director",
  "Director",
] as const;

export const CLUB_AGGREGATE_DIRECTOR_ROLE = "Directors" as const;

export const CLUB_TEAM_ROLE_CONFIG = {
  hackathon: {
    label: "Hackathon",
    teamRoleName: "KH IX Team",
    leadRoleName: "Hack Lead",
  },
  sponsorship: {
    label: "Sponsorship",
    teamRoleName: "Sponsorship Team",
    leadRoleName: "Sponsorship Director",
  },
  workshop: {
    label: "Workshop",
    teamRoleName: "Workshop Team",
    leadRoleName: "Workshop Director",
  },
  design: {
    label: "Design",
    teamRoleName: "Design Team",
    leadRoleName: "Design Director",
  },
  outreach: {
    label: "Outreach",
    teamRoleName: "Outreach Team",
    leadRoleName: "Outreach Director",
  },
  development: {
    label: "Development",
    teamRoleName: "Dev Team",
    leadRoleName: "Dev Lead",
  },
} as const;

export type ClubTeamRoleSlug = keyof typeof CLUB_TEAM_ROLE_CONFIG;

const CLUB_TEAM_ROLE_SLUGS = Object.keys(
  CLUB_TEAM_ROLE_CONFIG,
) as ClubTeamRoleSlug[];

export const CLUB_ROSTER_ROLE_NAMES = [
  ...CLUB_EXECUTIVE_ROLE_ORDER,
  CLUB_AGGREGATE_EXECUTIVE_ROLE,
  ...CLUB_DIRECTOR_ROLE_ORDER.filter((role) => role !== "Director"),
  CLUB_AGGREGATE_DIRECTOR_ROLE,
  ...CLUB_TEAM_ROLE_SLUGS.map(
    (slug) => CLUB_TEAM_ROLE_CONFIG[slug].teamRoleName,
  ),
] as const;

// This list is used only when bootstrapping the durable exclusion flag on a
// role. Event eligibility reads the persisted role identity flag afterward so
// renaming a role cannot silently expose organizational events to feedback.
export const EVENT_FEEDBACK_EXCLUDED_ROLE_NAMES = [
  "Dev Team",
  "Workshop Team",
  "Sponsorship Team",
  "Outreach Team",
  "Design Team",
  "KH IX Team",
  "President",
  "Vice President",
  "Treasurer",
  "Secretary",
  "Hack Lead",
  "Dev Lead",
  "Officers",
  "Design Director",
  "Sponsorship Director",
  "Outreach Director",
  "Workshop Director",
  "Directors",
] as const;
