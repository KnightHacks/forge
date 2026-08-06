import { describe, expect, it } from "vitest";

import {
  nextPublicationRetryAt,
  publicationHealth,
} from "../../utils/hackathon-events/publication-state";

describe("hackathon event publication state", () => {
  it("[TC-PUB-001] reports a fully converged disabled provider as off", () => {
    expect(
      publicationHealth({
        desiredEnabled: false,
        remoteCount: 0,
        states: ["succeeded", "succeeded"],
      }),
    ).toEqual({
      counts: {
        blocked: 0,
        converged: 2,
        error: 0,
        pending: 0,
        remote: 0,
        total: 2,
      },
      status: "off",
    });
  });

  it("[TC-PUB-006] distinguishes pending, degraded, and blocked work", () => {
    expect(
      publicationHealth({
        desiredEnabled: true,
        remoteCount: 1,
        states: ["succeeded", "pending"],
      }).status,
    ).toBe("publishing");
    expect(
      publicationHealth({
        desiredEnabled: true,
        remoteCount: 1,
        states: ["succeeded", "failed"],
      }).status,
    ).toBe("degraded");
    expect(
      publicationHealth({
        desiredEnabled: true,
        remoteCount: 1,
        states: ["failed", "blocked"],
      }).status,
    ).toBe("blocked");
  });

  it("[TC-PUB-006] caps retry delay and applies bounded jitter", () => {
    const now = new Date("2026-08-06T00:00:00.000Z");
    expect(
      nextPublicationRetryAt({ attemptCount: 1, now, random: () => 0 }),
    ).toEqual(new Date("2026-08-06T00:00:30.000Z"));
    expect(
      nextPublicationRetryAt({ attemptCount: 99, now, random: () => 1 }),
    ).toEqual(new Date("2026-08-06T00:36:00.000Z"));
  });
});
