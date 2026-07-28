import { RESUME_BUNDLE_DOWNLOAD_COOKIE } from "~/consts/browser-storage";

/**
 * The resume bundle is streamed by a route handler, not a mutation, so the only
 * channel back to the page is the cookie the route sets when the ZIP is ready or
 * has failed. `/api/admin/resume-bundle` writes `<token>.ready` or
 * `<token>.error`; this side polls and clears it.
 */
export function readResumeDownloadSignal() {
  const prefix = `${RESUME_BUNDLE_DOWNLOAD_COOKIE}=`;
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

export function clearResumeDownloadSignal() {
  document.cookie = `${RESUME_BUNDLE_DOWNLOAD_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
