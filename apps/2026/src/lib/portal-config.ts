import type { HackathonPortalConfig } from "./hacker-portal";

export const KHIX_PORTAL_CONFIG = {
  routes: {
    apply: "/apply",
    dashboard: "/dashboard",
    home: "/",
    profile: "/dashboard/profile",
  },
  termsUrl: "https://knight-hacks.notion.site/knight-hacks-26-tos",
  guideUrl:
    "https://app.notion.com/p/knight-hacks/Knight-Hacks-IX-Hackers-Guide-334e290ccffe80e39ec7ee1e20a33bae?source=copy_link",
  copy: {
    applicationName: "Knight Hacks IX",
    supportChannelUrl: "https://discord.knighthacks.org/",
  },
} satisfies HackathonPortalConfig;
