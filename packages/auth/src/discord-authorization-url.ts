const LEGACY_DISCORD_AUTHORIZATION_URL =
  "https://discord.com/api/oauth2/authorize";
const DISCORD_AUTHORIZATION_URL = "https://discord.com/oauth2/authorize";

/**
 * Better Auth 1.4 hardcodes Discord's legacy authorization path. Discord's
 * canonical path is equivalent, but remains available when the legacy edge
 * route is degraded.
 */
export function normalizeDiscordAuthorizationURL(url: string) {
  if (
    url === LEGACY_DISCORD_AUTHORIZATION_URL ||
    url.startsWith(`${LEGACY_DISCORD_AUTHORIZATION_URL}?`)
  ) {
    return `${DISCORD_AUTHORIZATION_URL}${url.slice(
      LEGACY_DISCORD_AUTHORIZATION_URL.length,
    )}`;
  }

  return url;
}
