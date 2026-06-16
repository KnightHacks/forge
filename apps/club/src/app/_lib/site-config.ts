export const SITE_URL = "https://club.knighthacks.org";
export const SITE_NAME = "Knight Hacks";
export const ORGANIZATION_NAME = "Knight Hacks";
export const ORGANIZER_EMAIL = "team@knighthacks.org";
export const PRESIDENT_EMAIL = "president@knighthacks.org";
export const SITE_LAST_MODIFIED = "2026-06-15";
export const RESOURCE_LIBRARY_PUBLISHED_AT = "2026-06-11";
export const RESOURCE_LIBRARY_UPDATED_AT = SITE_LAST_MODIFIED;
export const CLUB_ASSET_BASE_URL = "https://assets.knighthacks.org";

export const PUBLIC_LINKS = {
  blade: "https://blade.knighthacks.org",
  discord: "https://discord.gg/knighthacks",
  github: "https://github.com/KnightHacks",
  instagram: "https://www.instagram.com/knighthacks/",
  linkedin: "https://www.linkedin.com/company/knight-hacks",
  linktree: "https://linktr.ee/knighthacks",
  mascotArtistLinkedIn: "https://www.linkedin.com/in/lena-tran-/",
  x: "https://twitter.com/knighthacks",
} as const;

export const SOCIAL_PROFILE_URLS = [
  PUBLIC_LINKS.discord,
  PUBLIC_LINKS.instagram,
  PUBLIC_LINKS.linkedin,
  PUBLIC_LINKS.github,
  PUBLIC_LINKS.linktree,
  PUBLIC_LINKS.x,
] as const;

export const CLUB_NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Events", href: "/events" },
  { label: "Hackathons", href: "/hackathons" },
  { label: "Teams", href: "/teams" },
  { label: "Sponsors", href: "/sponsors" },
] as const;

export const FOOTER_QUICK_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Join", href: "/join" },
  { label: "Events", href: "/events" },
  { label: "Hackathons", href: "/hackathons" },
  { label: "Teams", href: "/teams" },
  { label: "Sponsors", href: "/sponsors" },
] as const;

export const FOOTER_RESOURCE_LINKS = [
  { label: "Resources", href: "/resources" },
  { label: "Kickstart", href: "/kickstart" },
  { label: "Project Launch", href: "/project-launch" },
  { label: "Code of Conduct", href: "/code-of-conduct" },
  { label: "Discord", href: PUBLIC_LINKS.discord },
  { label: "GitHub", href: PUBLIC_LINKS.github },
] as const;

export const CANONICAL_ROUTES = [
  "/",
  "/about",
  "/join",
  "/events",
  "/kickstart",
  "/project-launch",
  "/hackathons",
  "/teams",
  "/sponsors",
  "/resources",
  "/code-of-conduct",
] as const;
