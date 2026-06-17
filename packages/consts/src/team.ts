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
    terms: ["executive", "officer", "officers"],
  },
  {
    slug: "directors",
    label: "Directors",
    heading: "Directors",
    terms: ["director", "directors"],
  },
  {
    slug: "hackathon",
    label: "Hackathon",
    heading: "Hackathon Team",
    terms: ["hackathon", "hack org", "hackorg", "kh ix", "khix"],
  },
  {
    slug: "sponsorship",
    label: "Sponsorship",
    heading: "Sponsorship Team",
    terms: ["sponsor", "sponsorship"],
  },
  {
    slug: "workshop",
    label: "Workshop",
    heading: "Workshop Team",
    terms: ["workshop"],
  },
  {
    slug: "design",
    label: "Design",
    heading: "Design Team",
    terms: ["design"],
  },
  {
    slug: "outreach",
    label: "Outreach",
    heading: "Outreach Team",
    terms: ["outreach"],
  },
  {
    slug: "development",
    label: "Development",
    heading: "Development Team",
    terms: ["development", "developer", "dev team"],
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
  "Development Lead",
  "Executive Officer",
] as const;
