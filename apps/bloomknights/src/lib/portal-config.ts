import type { HackathonPortalConfig } from "@forge/hackathon";

export const BLOOM_PORTAL_CONFIG = {
  hackathonName: "bloomknights",
  routes: {
    home: "/",
    dashboard: "/dashboard",
    apply: "/apply",
    profile: "/dashboard/profile",
  },
  termsUrl: "https://knight-hacks.notion.site/knight-hacks-26-tos",
  guideUrl: "https://knight-hacks.notion.site/bloomknights2026",
  copy: {
    applicationName: "BloomKnights",
    supportChannelUrl: "https://discord.knighthacks.org/",
  },
} satisfies HackathonPortalConfig;
