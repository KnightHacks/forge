import { env } from "~/env";

export const GUILD_URL = env.NEXT_PUBLIC_GUILD_URL.replace(/\/+$/, "");

export function getGuildMemberUrl(memberId: string) {
  return `${GUILD_URL}/members/${encodeURIComponent(memberId)}`;
}
