export const OFFICERS = [
  {
    name: "Dylan Vidal",
    position: "President",
    image: "/officers/dylan.png",
    linkedin: "https://www.linkedin.com/in/dylanvidal1204/",
    major: "Computer Science",
  },
  {
    name: "Leonard Gofman",
    position: "Vice President",
    image: "/officers/leo.png",
    linkedin: "https://www.linkedin.com/in/leonard-gofman-208578236/",
    major: "Computer Science",
  },
  {
    name: "Adrian Osorio",
    position: "Treasurer",
    image: "/officers/adrian.png",
    linkedin: "https://www.linkedin.com/in/adrianosoriob/",
    major: "Computer Engineering",
  },
  {
    name: "Lewin Bobda",
    position: "Dev Lead",
    image: "/officers/bobda.png",
    linkedin: "https://www.linkedin.com/in/lewin-bobda-08ba2325a/",
    major: "Computer Science",
  },
  {
    name: "Daniel Efres",
    position: "Secretary",
    image: "/officers/daniel.png",
    linkedin: "https://www.linkedin.com/in/daniel-efres/",
    major: "Computer Science",
  },
  {
    name: "Richard Phillips",
    position: "Hack Lead",
    image: "/officers/ricky.png",
    linkedin: "https://www.linkedin.com/in/rphillipscs/",
    major: "Computer Science",
  },
] as const;

export type Officer = (typeof OFFICERS)[number];

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
