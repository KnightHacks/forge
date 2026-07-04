export function sanitizeCallbackURL(
  callbackURL: string | null | undefined,
  appBaseURL: string,
  defaultPath = "/",
): string {
  if (!callbackURL) return defaultPath;

  try {
    const appURL = new URL(appBaseURL);
    const resolved = new URL(callbackURL, appURL);

    if (resolved.origin !== appURL.origin) {
      return defaultPath;
    }

    if (!resolved.pathname.startsWith("/")) {
      return defaultPath;
    }

    return `${resolved.pathname}${resolved.search}`;
  } catch {
    return defaultPath;
  }
}
