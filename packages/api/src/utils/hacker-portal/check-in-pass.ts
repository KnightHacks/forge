import { createHmac } from "node:crypto";

import { env } from "@forge/auth/env";

function tokenSecret() {
  const configured = env.BETTER_AUTH_SECRET;
  if (configured) return configured;
  if (env.NODE_ENV !== "production") {
    // Local and disposable-test databases contain no production identities.
    // Keeping this stable makes an issued local QR reproducible after a restart.
    return "forge-local-hacker-check-in-pass-v1";
  }
  throw new Error(
    "BETTER_AUTH_SECRET is required to issue Hacker SDK check-in passes.",
  );
}

/**
 * Reconstructs the response-only QR secret from durable, non-secret identity.
 * The database stores its SHA-256 lookup hash and safe command metadata only.
 */
export function deriveOpaqueHackerCheckInPass(
  input: { commandId: string; hackathonId: string; userId: string },
  secret = tokenSecret(),
) {
  const digest = createHmac("sha256", secret)
    .update("forge-hacker-check-in-pass:v1\0")
    .update(input.commandId)
    .update("\0")
    .update(input.hackathonId)
    .update("\0")
    .update(input.userId)
    .digest("base64url");
  return `fhp1.${digest}`;
}
