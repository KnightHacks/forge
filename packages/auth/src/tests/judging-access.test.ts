import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  createGuestJudgeCredential,
  hashGuestJudgeCredential,
  readCookieValue,
  signJudgingRoomLink,
  verifyJudgingRoomLink,
} from "../judging-access";

describe("judging access credentials", () => {
  it("signs a room link deterministically and rejects tampering", () => {
    const secret = randomBytes(32).toString("hex");
    const signature = signJudgingRoomLink("link-1", secret);

    expect(signJudgingRoomLink("link-1", secret)).toBe(signature);
    expect(verifyJudgingRoomLink("link-1", signature, secret)).toBe(true);
    expect(verifyJudgingRoomLink("link-2", signature, secret)).toBe(false);
    expect(verifyJudgingRoomLink("link-1", `${signature}x`, secret)).toBe(
      false,
    );
  });

  it("creates opaque credentials and stores only stable hashes", () => {
    const first = createGuestJudgeCredential();
    const second = createGuestJudgeCredential();

    expect(first).not.toBe(second);
    expect(hashGuestJudgeCredential(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashGuestJudgeCredential(first)).toBe(
      hashGuestJudgeCredential(first),
    );
  });

  it("reads an encoded judging cookie without confusing adjacent names", () => {
    expect(
      readCookieValue(
        "blade_judging_guest_old=no; blade_judging_guest=abc%2F123; theme=dark",
        "blade_judging_guest",
      ),
    ).toBe("abc/123");
  });

  it.each(["%", "%2", "%ZZ"])(
    "treats malformed cookie encoding %s as absent",
    (value) => {
      expect(
        readCookieValue(`blade_judging_guest=${value}`, "blade_judging_guest"),
      ).toBeNull();
    },
  );
});
