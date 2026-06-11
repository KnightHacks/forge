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

export const FEATURED_SUPPORTER_SLIDES = [
  {
    id: "hackathon-floor",
    imageSrc: "/hackathon.JPG",
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
    imageSrc: "/projects1.JPG",
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
    imageSrc: "/workshops2.jpg",
    alt: "Knight Hacks workshop session with students",
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
    imageSrc: "/members.JPG",
    alt: "Knight Hacks members at a community event",
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
