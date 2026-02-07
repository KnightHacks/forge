import { env } from "./env";

const HOME_PATH = "/";

export function sanitizeCallbackURL(callbackURL?: string | null): string {
  if (!callbackURL) return HOME_PATH;

  try {
    const appURL = new URL(env.NEXT_PUBLIC_BLADE_URL);
    const resolved = new URL(callbackURL, appURL);

    if (resolved.origin !== appURL.origin) {
      return HOME_PATH;
    }

    if (!resolved.pathname.startsWith("/")) {
      return HOME_PATH;
    }

    return `${resolved.pathname}${resolved.search}`;
  } catch {
    return HOME_PATH;
  }
}
