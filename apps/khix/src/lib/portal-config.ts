import type { HackathonPortalConfig } from "./hacker-portal";

export const KHIX_PORTAL_CONFIG = {
  routes: {
    apply: "/apply",
    dashboard: "/dashboard",
    home: "/",
    profile: "/dashboard/profile",
  },
  termsUrl: "https://knight-hacks.notion.site/knight-hacks-26-tos",
  guideUrl: "https://knight-hacks.notion.site/knighthacksix",
  copy: {
    applicationName: "Knight Hacks IX",
    supportChannelUrl: "https://discord.knighthacks.org/",
  },
} satisfies HackathonPortalConfig;
