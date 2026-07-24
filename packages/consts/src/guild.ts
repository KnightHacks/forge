export const GUILD_TAG_OPTIONS = ["alumni", "current"] as const;
export type GuildTag = (typeof GUILD_TAG_OPTIONS)[number];

export const GUILD_OPPORTUNITY_STATUS_OPTIONS = [
  "internships",
  "full-time",
  "freelance-contract",
  "project-collaboration",
  "offering-mentorship",
  "seeking-mentorship",
] as const;

export type GuildOpportunityStatus =
  (typeof GUILD_OPPORTUNITY_STATUS_OPTIONS)[number];

export const GUILD_OPPORTUNITY_STATUS_LABELS = {
  internships: "Open to internships",
  "full-time": "Open to full-time roles",
  "freelance-contract": "Open to freelance or contract work",
  "project-collaboration": "Open to project collaboration",
  "offering-mentorship": "Offering mentorship",
  "seeking-mentorship": "Seeking mentorship",
} as const satisfies Record<GuildOpportunityStatus, string>;

export const GUILD_MAX_OPPORTUNITY_STATUSES = 3;
export const GUILD_DEFAULT_PAGE_SIZE = 24;
export const GUILD_MAX_PAGE_SIZE = 48;

export const MEMBER_PROFILE_ICON_SIZE = 24;
