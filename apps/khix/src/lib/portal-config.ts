import type { HackathonPortalConfig } from "@forge/hackathon";

export const KHIX_HACKATHON_NAMES = [
  "knighthacksix",
  "khix",
  "knight-hacks-ix",
] as const;

export const KHIX_DEFAULT_HACKATHON_NAME = KHIX_HACKATHON_NAMES[0];

export const KHIX_PORTAL_CONFIG = {
  hackathonName: KHIX_DEFAULT_HACKATHON_NAME,
  routes: {
    home: "/",
    dashboard: "/dashboard",
    apply: "/apply",
    profile: "/dashboard/profile",
  },
  termsUrl: "https://knight-hacks.notion.site/knight-hacks-26-tos",
  guideUrl: "https://knight-hacks.notion.site/knighthacksix",
  copy: {
    applicationName: "Knight Hacks IX",
    supportChannelUrl: "https://discord.gg/2W2HCvkKAy",
  },
} satisfies HackathonPortalConfig;
