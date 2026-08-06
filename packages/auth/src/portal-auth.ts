import { createHash, randomBytes } from "node:crypto";

function toBase64Url(value: Buffer) {
  return value.toString("base64url");
}

export function createPortalToken() {
  return toBase64Url(randomBytes(32));
}

export function hashPortalToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPkceVerifier() {
  return createPortalToken();
}

export function createPkceChallenge(verifier: string) {
  return toBase64Url(createHash("sha256").update(verifier).digest());
}

function isLoopback(hostname: string) {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  );
}

export function isAllowedPortalCallback(input: {
  callbackURL: string;
  environment: "development" | "production" | "test";
  registeredOrigin: string;
}) {
  try {
    const callback = new URL(input.callbackURL);
    const registered = new URL(input.registeredOrigin);
    if (
      input.environment === "development" &&
      callback.protocol === "http:" &&
      isLoopback(callback.hostname)
    ) {
      return true;
    }

    return (
      callback.protocol === "https:" &&
      callback.origin === registered.origin &&
      callback.hostname.endsWith(".knighthacks.org")
    );
  } catch {
    return false;
  }
}

export function sanitizePortalReturnPath(returnPath?: string | null) {
  if (!returnPath?.startsWith("/") || returnPath.startsWith("//")) return "/";
  if (returnPath.includes("\\")) return "/";

  try {
    const resolved = new URL(returnPath, "https://portal.invalid");
    if (resolved.origin !== "https://portal.invalid") return "/";
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return "/";
  }
}
