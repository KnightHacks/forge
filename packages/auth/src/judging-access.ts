import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const JUDGING_GUEST_COOKIE = "blade_judging_guest";
export const JUDGING_GUEST_SESSION_SECONDS = 8 * 60 * 60;

export function signJudgingRoomLink(linkId: string, secret: string) {
  return createHmac("sha256", secret).update(linkId).digest("base64url");
}

export function verifyJudgingRoomLink(
  linkId: string,
  signature: string,
  secret: string,
) {
  const expected = Buffer.from(signJudgingRoomLink(linkId, secret));
  const received = Buffer.from(signature);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export function createGuestJudgeCredential() {
  return randomBytes(32).toString("base64url");
}

export function hashGuestJudgeCredential(credential: string) {
  return createHash("sha256").update(credential).digest("hex");
}

export function readCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}
