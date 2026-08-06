import { describe, expect, it } from "vitest";

import {
  hashOpaqueHackerCheckInPass,
  parseOpaqueHackerCheckInPass,
} from "../../utils/hackathon-events/check-in";
import { deriveOpaqueHackerCheckInPass } from "../../utils/hacker-portal/check-in-pass";

describe("opaque hacker check-in pass", () => {
  const payload = `fhp1.${"a".repeat(43)}`;

  it("recognizes only the versioned opaque payload shape", () => {
    expect(parseOpaqueHackerCheckInPass(payload)).toBe(payload);
    expect(parseOpaqueHackerCheckInPass(`fhp2.${"a".repeat(43)}`)).toBeNull();
    expect(
      parseOpaqueHackerCheckInPass("00000000-0000-4000-8000-000000000000"),
    ).toBeNull();
  });

  it("uses a stable one-way database identity", () => {
    expect(hashOpaqueHackerCheckInPass(payload)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOpaqueHackerCheckInPass(payload)).toBe(
      hashOpaqueHackerCheckInPass(payload),
    );
    expect(hashOpaqueHackerCheckInPass(payload)).not.toContain(payload);
  });

  it("reconstructs a stable pass without persisting the usable payload", () => {
    const identity = {
      commandId: "command-1",
      hackathonId: "hackathon-1",
      userId: "user-1",
    };
    const first = deriveOpaqueHackerCheckInPass(identity, "test-secret");

    expect(parseOpaqueHackerCheckInPass(first)).toBe(first);
    expect(deriveOpaqueHackerCheckInPass(identity, "test-secret")).toBe(first);
    expect(
      deriveOpaqueHackerCheckInPass(
        { ...identity, commandId: "command-2" },
        "test-secret",
      ),
    ).not.toBe(first);
    expect(first).not.toContain(identity.commandId);
    expect(first).not.toContain(identity.userId);
  });
});
