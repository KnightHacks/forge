import { CLUB_ASSETS } from "../_lib/assets";

export const SPONSOR_SECTIONS = [
  {
    tier: "gold",
    label: "Gold",
    heading: "Gold Sponsors",
    tileClassName: "md:col-span-2",
  },
  {
    tier: "silver",
    label: "Silver",
    heading: "Silver Sponsors",
    tileClassName: "",
  },
  {
    tier: "bronze",
    label: "Bronze",
    heading: "Bronze Sponsors",
    tileClassName: "",
  },
] as const;

export const PARTNER_SECTION = {
  tier: "other",
  label: "Partner",
  heading: "Our Partners",
} as const;

const FORGE_CDN_ROOT = "https://cdn.jsdelivr.net/gh/KnightHacks/forge@main";
const CLUB_LOGO_CDN_ROOT = `${FORGE_CDN_ROOT}/apps/club/public/logos`;
const KH2025_SPONSOR_LOGO_CDN_ROOT = `${FORGE_CDN_ROOT}/apps/2025/public/sponsorSectionSvgs`;
const KH2025_PARTNER_LOGO_CDN_ROOT = `${FORGE_CDN_ROOT}/apps/2025/public/partnersSection`;
const GEMIKNIGHTS_LOGO_CDN_ROOT = `${FORGE_CDN_ROOT}/apps/gemiknights/public`;

const clubLogo = (fileName: string) => `${CLUB_LOGO_CDN_ROOT}/${fileName}`;
const kh2025SponsorLogo = (fileName: string) =>
  `${KH2025_SPONSOR_LOGO_CDN_ROOT}/${fileName}`;
const kh2025PartnerLogo = (fileName: string) =>
  `${KH2025_PARTNER_LOGO_CDN_ROOT}/${fileName}`;
const gemiknightsLogo = (fileName: string) =>
  `${GEMIKNIGHTS_LOGO_CDN_ROOT}/${fileName}`;
const simpleIcon = (slug: string, color?: string) =>
  `https://cdn.simpleicons.org/${slug}${color ? `/${color}` : ""}`;

export const FALLBACK_SPONSOR_LOGO_CDN_ROOT = CLUB_LOGO_CDN_ROOT;

export const ONLINE_SPONSOR_LOGOS: Record<string, string> = {
  acm: kh2025PartnerLogo("acm.svg"),
  "ai at ucf": kh2025PartnerLogo("ai.svg"),
  alienware: simpleIcon("alienware"),
  amd: kh2025SponsorLogo("amd.svg"),
  "american express": clubLogo("amex.svg"),
  amex: clubLogo("amex.svg"),
  "amazon web services": clubLogo("aws.svg"),
  aws: clubLogo("aws.svg"),
  auritas: kh2025SponsorLogo("auritas.svg"),
  azure: clubLogo("azure.svg"),
  bny: kh2025SponsorLogo("bny.svg"),
  "bny mellon": kh2025SponsorLogo("bny.svg"),
  "capital one": clubLogo("c1.svg"),
  cecs: kh2025PartnerLogo("cecs.svg"),
  chase: clubLogo("chase.svg"),
  digitalocean: simpleIcon("digitalocean"),
  "digital ocean": simpleIcon("digitalocean"),
  disney:
    "https://upload.wikimedia.org/wikipedia/commons/4/44/The_Walt_Disney_Company_Logo.svg",
  ea: clubLogo("ea.svg"),
  "electronic arts": clubLogo("ea.svg"),
  facebook: clubLogo("facebook.svg"),
  geico: clubLogo("geico.svg"),
  "gamer development knights": "",
  gdk: "",
  gemini: gemiknightsLogo("Google_Gemini_logo.svg"),
  github: simpleIcon("github", "FFFFFF"),
  "github education": simpleIcon("github", "FFFFFF"),
  "girls who code": kh2025PartnerLogo("gwc.svg"),
  google: kh2025SponsorLogo("google.svg"),
  "google cloud": clubLogo("googlecloud.svg"),
  "google gemini": gemiknightsLogo("Google_Gemini_logo.svg"),
  "goldman sachs": clubLogo("goldman.svg"),
  gwc: kh2025PartnerLogo("gwc.svg"),
  ibm: clubLogo("ibm.svg"),
  ieee: kh2025PartnerLogo("ieee.svg"),
  "j p morgan": clubLogo("chase.svg"),
  "j p morgan chase": clubLogo("chase.svg"),
  "jp morgan": clubLogo("chase.svg"),
  "jp morgan chase": clubLogo("chase.svg"),
  "major league hacking": kh2025PartnerLogo("mlh.svg"),
  "lockheed martin": kh2025SponsorLogo("lockheed-martin.svg"),
  microsoft: clubLogo("microsoft.svg"),
  "microsoft azure": clubLogo("azure.svg"),
  mlh: kh2025PartnerLogo("mlh.svg"),
  morgan: "",
  "morgan and morgan": "",
  nasa: simpleIcon("nasa", "FFFFFF"),
  nextera: kh2025SponsorLogo("nextera-energy.svg"),
  "nextera energy": kh2025SponsorLogo("nextera-energy.svg"),
  nvidia: kh2025SponsorLogo("nvidia.svg"),
  oneethos: kh2025SponsorLogo("oneethos.svg"),
  oracle: "https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg",
  pwc: "https://upload.wikimedia.org/wikipedia/commons/c/c3/PwC_Company_Logo.svg",
  qualcomm: simpleIcon("qualcomm"),
  rbc: clubLogo("rbc.svg"),
  roblox: kh2025SponsorLogo("roblox.svg"),
  "royal bank of canada": clubLogo("rbc.svg"),
  sase: kh2025PartnerLogo("sase.svg"),
  servicenow: kh2025SponsorLogo("servicenow.svg"),
  "service now": kh2025SponsorLogo("servicenow.svg"),
  shinies: kh2025SponsorLogo("shinies.svg"),
  "shinies props": kh2025SponsorLogo("shinies.svg"),
  sidewalk: kh2025SponsorLogo("sidewalk.svg"),
  siemens: clubLogo("Siemens.svg"),
  "siemens energy": clubLogo("Siemens.svg"),
  snap: simpleIcon("snapchat"),
  snapchat: simpleIcon("snapchat"),
  statsig: kh2025SponsorLogo("statsig.svg"),
  synopsys: kh2025SponsorLogo("synopsys.svg"),
  "texas instruments": clubLogo("texasinstruments.svg"),
  ti: clubLogo("texasinstruments.svg"),
  "ucf cecs": kh2025PartnerLogo("cecs.svg"),
} as const;

export const PAST_SPONSORS = [
  {
    id: "google",
    name: "Google",
    logoUrl: ONLINE_SPONSOR_LOGOS.google,
  },
  {
    id: "oneethos",
    name: "OneEthos",
    logoUrl: ONLINE_SPONSOR_LOGOS.oneethos,
  },
  {
    id: "lockheed-martin",
    name: "Lockheed Martin",
    logoUrl: ONLINE_SPONSOR_LOGOS["lockheed martin"],
  },
  {
    id: "github",
    name: "GitHub",
    logoUrl: ONLINE_SPONSOR_LOGOS.github,
  },
  {
    id: "nasa",
    name: "NASA",
    logoUrl: ONLINE_SPONSOR_LOGOS.nasa,
  },
  {
    id: "nvidia",
    name: "NVIDIA",
    logoUrl: ONLINE_SPONSOR_LOGOS.nvidia,
  },
  {
    id: "amd",
    name: "AMD",
    logoUrl: ONLINE_SPONSOR_LOGOS.amd,
  },
  {
    id: "statsig",
    name: "Statsig",
    logoUrl: ONLINE_SPONSOR_LOGOS.statsig,
  },
  {
    id: "nextera-energy",
    name: "NextEra Energy",
    logoUrl: ONLINE_SPONSOR_LOGOS["nextera energy"],
  },
  {
    id: "bny",
    name: "BNY",
    logoUrl: ONLINE_SPONSOR_LOGOS.bny,
  },
  {
    id: "servicenow",
    name: "ServiceNow",
    logoUrl: ONLINE_SPONSOR_LOGOS.servicenow,
  },
  {
    id: "auritas",
    name: "Auritas",
    logoUrl: ONLINE_SPONSOR_LOGOS.auritas,
  },
  {
    id: "morgan-and-morgan",
    name: "Morgan & Morgan",
    logoUrl: ONLINE_SPONSOR_LOGOS["morgan and morgan"],
  },
  {
    id: "shinies-props",
    name: "Shinies Props",
    logoUrl: ONLINE_SPONSOR_LOGOS["shinies props"],
  },
  {
    id: "mlh",
    name: "Major League Hacking",
    logoUrl: ONLINE_SPONSOR_LOGOS.mlh,
  },
  {
    id: "synopsys",
    name: "Synopsys",
    logoUrl: ONLINE_SPONSOR_LOGOS.synopsys,
  },
  {
    id: "ibm",
    name: "IBM",
    logoUrl: ONLINE_SPONSOR_LOGOS.ibm,
  },
  {
    id: "siemens-energy",
    name: "Siemens Energy",
    logoUrl: ONLINE_SPONSOR_LOGOS["siemens energy"],
  },
  {
    id: "geico",
    name: "GEICO",
    logoUrl: ONLINE_SPONSOR_LOGOS.geico,
  },
  {
    id: "microsoft",
    name: "Microsoft",
    logoUrl: ONLINE_SPONSOR_LOGOS.microsoft,
  },
  {
    id: "rbc",
    name: "RBC",
    logoUrl: ONLINE_SPONSOR_LOGOS.rbc,
  },
  {
    id: "american-express",
    name: "American Express",
    logoUrl: ONLINE_SPONSOR_LOGOS["american express"],
  },
  {
    id: "aws",
    name: "AWS",
    logoUrl: ONLINE_SPONSOR_LOGOS.aws,
  },
  {
    id: "digitalocean",
    name: "DigitalOcean",
    logoUrl: ONLINE_SPONSOR_LOGOS.digitalocean,
  },
  {
    id: "alienware",
    name: "Alienware",
    logoUrl: ONLINE_SPONSOR_LOGOS.alienware,
  },
  {
    id: "pwc",
    name: "PwC",
    logoUrl: ONLINE_SPONSOR_LOGOS.pwc,
  },
  {
    id: "oracle",
    name: "Oracle",
    logoUrl: ONLINE_SPONSOR_LOGOS.oracle,
  },
  {
    id: "capital-one",
    name: "Capital One",
    logoUrl: ONLINE_SPONSOR_LOGOS["capital one"],
  },
  {
    id: "disney",
    name: "Disney",
    logoUrl: ONLINE_SPONSOR_LOGOS.disney,
  },
  {
    id: "ea",
    name: "EA",
    logoUrl: ONLINE_SPONSOR_LOGOS.ea,
  },
  {
    id: "facebook",
    name: "Facebook",
    logoUrl: ONLINE_SPONSOR_LOGOS.facebook,
  },
  {
    id: "pheratech-systems",
    name: "Pheratech Systems",
    logoUrl: "",
  },
  {
    id: "impress-ink",
    name: "Impress Ink",
    logoUrl: "",
  },
  {
    id: "kinde",
    name: "Kinde",
    logoUrl: "",
  },
  {
    id: "toolcharm",
    name: "ToolCharm",
    logoUrl: "",
  },
  {
    id: "domain-com",
    name: "Domain.com",
    logoUrl: "",
  },
] as const;

export const FEATURED_SUPPORTER_SLIDES = [
  {
    id: "hackathon-floor",
    imageSrc: CLUB_ASSETS.hackathonFloorGathering,
    alt: "Students gathering at a Knight Hacks event",
    eyebrow: "Sponsor Highlight",
    title: "Fueling Hackathon Weekend",
    description:
      "Supporters help turn campus space into a full weekend of building, mentorship, food, prizes, and demos.",
    accentClassName: "bg-[#de2868] text-white",
    lineClassName: "border-[var(--club-gold)]",
    dotClassName: "bg-[var(--club-gold)]",
    frameClassName:
      "border-white/22 shadow-[10px_12px_0_rgba(222,40,104,0.24)]",
  },
  {
    id: "project-builds",
    imageSrc: CLUB_ASSETS.projectLaunchPresentations,
    alt: "Students working together on project builds",
    eyebrow: "Builder Support",
    title: "Backing Real Projects",
    description:
      "Every workshop, challenge, and sponsor conversation gives students more ways to ship work they can be proud of.",
    accentClassName: "bg-[var(--club-gold)] text-black",
    lineClassName: "border-[#de2868]",
    dotClassName: "bg-[#de2868]",
    frameClassName:
      "border-[var(--club-gold)]/70 shadow-[10px_12px_0_rgba(255,182,43,0.2)]",
  },
  {
    id: "workshop-room",
    imageSrc: CLUB_ASSETS.serviceNowSponsorPegasus,
    alt: "Knight Hacks students with a ServiceNow sponsor table",
    eyebrow: "Partner Impact",
    title: "Teaching Beyond Class",
    description:
      "Our partners make hands-on learning possible through technical sessions, recruiting touchpoints, and community support.",
    accentClassName: "bg-[#8e4ed6] text-white",
    lineClassName: "border-[#8e4ed6]",
    dotClassName: "bg-[#8e4ed6]",
    frameClassName:
      "border-[#8e4ed6]/70 shadow-[10px_12px_0_rgba(142,78,214,0.24)]",
  },
  {
    id: "member-community",
    imageSrc: CLUB_ASSETS.amdSponsorTeamPhoto,
    alt: "Knight Hacks students with AMD sponsor representatives",
    eyebrow: "Community Support",
    title: "Growing Student Builders",
    description:
      "Sponsors help keep Knight Hacks accessible for students discovering software, design, hardware, and product work.",
    accentClassName: "bg-[#2c9fbc] text-white",
    lineClassName: "border-[#2c9fbc]",
    dotClassName: "bg-[#2c9fbc]",
    frameClassName:
      "border-[#2c9fbc]/70 shadow-[10px_12px_0_rgba(44,159,188,0.22)]",
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: "What does sponsoring Knight Hacks support?",
    answer:
      "Sponsorship helps fund hackathons, workshops, food, prizes, travel support, and the infrastructure that lets students build real projects together.",
  },
  {
    question: "Can sponsors host workshops or challenges?",
    answer:
      "Yes. Sponsors can run technical workshops, recruit through events, create prize challenges, and meet builders directly throughout the year.",
  },
  {
    question: "Do you work with startups and local partners?",
    answer:
      "Yes. Knight Hacks works with companies, campus organizations, community groups, and local teams that want to support student builders.",
  },
  {
    question: "How do we become a sponsor?",
    answer:
      "Reach out through the sponsor form and our sponsorship team will follow up with options for the current season.",
  },
] as const;

export type SponsorTier =
  | (typeof SPONSOR_SECTIONS)[number]["tier"]
  | typeof PARTNER_SECTION.tier;

export interface SponsorRecord {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string;
  tier: SponsorTier;
}

export interface SponsorHackathon {
  id: string;
  name: string;
  displayName: string;
  startDate: string;
}

export type FeaturedSupporterSlide = (typeof FEATURED_SUPPORTER_SLIDES)[number];
