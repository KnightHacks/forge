export const GUILD_TAG_OPTIONS = ["alumni", "current"] as const;
export type GuildTag = (typeof GUILD_TAG_OPTIONS)[number];

export const MEMBER_PROFILE_ICON_SIZE = 24;
