import { z } from "zod";

export type SocialProfileProvider = "github" | "linkedin";

const PROVIDER_CONFIG = {
  github: {
    canonicalHost: "github.com",
    hosts: new Set(["github.com", "www.github.com"]),
    usernamePath: (username: string) => username,
  },
  linkedin: {
    canonicalHost: "www.linkedin.com",
    hosts: new Set(["linkedin.com", "www.linkedin.com"]),
    usernamePath: (username: string) => `in/${username}`,
  },
} satisfies Record<
  SocialProfileProvider,
  {
    canonicalHost: string;
    hosts: Set<string>;
    usernamePath: (username: string) => string;
  }
>;

function cleanPath(pathname: string) {
  const path = pathname.replace(/^\/+|\/+$/g, "");
  if (!path) return null;

  try {
    if (/\s/.test(decodeURIComponent(path))) return null;
  } catch {
    return null;
  }

  return path;
}

/**
 * Accepts either a username or a pasted provider URL and returns the stable URL
 * stored by Forge. Query strings and fragments are intentionally discarded:
 * profile links should not retain tracking parameters.
 */
export function normalizeSocialProfileUrl(
  input: string,
  provider: SocialProfileProvider,
) {
  const config = PROVIDER_CONFIG[provider];
  const value = input.trim();
  if (!value) return null;

  const hasProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(value);
  const looksLikeProviderUrl = Array.from(config.hosts).some(
    (host) =>
      value.toLowerCase() === host ||
      value.toLowerCase().startsWith(`${host}/`),
  );

  if (hasProtocol || looksLikeProviderUrl) {
    let url: URL;
    try {
      url = new URL(hasProtocol ? value : `https://${value}`);
    } catch {
      return null;
    }

    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      !config.hosts.has(url.hostname.toLowerCase()) ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }

    const path = cleanPath(url.pathname);
    return path ? `https://${config.canonicalHost}/${path}` : null;
  }

  const username = value.replace(/^@/, "").replace(/\/+$/, "");
  if (!username || /[\s/?#]/.test(username)) return null;

  return `https://${config.canonicalHost}/${config.usernamePath(username)}`;
}

export function socialProfileUrlSchema(
  label: string,
  provider: SocialProfileProvider,
) {
  return z
    .string()
    .trim()
    .transform((value, context) => {
      const normalized = normalizeSocialProfileUrl(value, provider);
      if (!normalized) {
        context.addIssue({
          code: "custom",
          message: `${label} must be a valid ${provider === "github" ? "GitHub" : "LinkedIn"} username or profile URL.`,
        });
        return z.NEVER;
      }
      if (normalized.length > 255) {
        context.addIssue({
          code: "custom",
          message: `${label} must be 255 characters or fewer.`,
        });
        return z.NEVER;
      }
      return normalized;
    });
}

export function optionalSocialProfileUrl(
  label: string,
  provider: SocialProfileProvider,
) {
  return socialProfileUrlSchema(label, provider).optional().or(z.literal(""));
}

export function nullableSocialProfileUrl(
  label: string,
  provider: SocialProfileProvider,
) {
  return socialProfileUrlSchema(label, provider).nullable();
}
