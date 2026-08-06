import { cleanupPortalCredentials } from "@forge/auth/server";

export async function cleanupExpiredHackerPortalCredentials(now = new Date()) {
  return cleanupPortalCredentials(now);
}
