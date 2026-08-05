import { describe, expect, it, vi } from "vitest";

/**
 * Who actually receives status mail outside production.
 *
 * A development environment points at the real applicant table, so an officer
 * testing a bulk accept would otherwise mail several hundred real students from
 * a laptop. Statuses still move for everyone — the roster has to behave exactly
 * as it will in production — but only addresses belonging to someone holding a
 * role are written as recipients.
 *
 * This is the same rule the campaign path already applies, and it is the only
 * thing standing between a local click and a few hundred real inboxes, so it is
 * pinned here rather than left to the environment.
 */
describe("status mail recipients by environment", () => {
  it("is unrestricted when the development review gate is off", async () => {
    vi.resetModules();
    vi.doMock("../../env", () => ({
      isBladeE2E: false,
      nodeEnv: "production",
    }));

    const { developmentCampaignReviewEnabled } =
      await import("../../utils/email/delivery");
    expect(developmentCampaignReviewEnabled()).toBe(false);
  });

  it("is restricted in development, and lifted for the e2e run", async () => {
    vi.resetModules();
    vi.doMock("../../env", () => ({
      isBladeE2E: false,
      nodeEnv: "development",
    }));
    const dev = await import("../../utils/email/delivery");
    expect(dev.developmentCampaignReviewEnabled()).toBe(true);

    vi.resetModules();
    vi.doMock("../../env", () => ({
      isBladeE2E: true,
      nodeEnv: "development",
    }));
    const e2e = await import("../../utils/email/delivery");
    // The e2e suite drives the real send path deliberately, against fixtures.
    expect(e2e.developmentCampaignReviewEnabled()).toBe(false);
  });

  it("never records a hackathon audience while restricted", async () => {
    vi.resetModules();
    vi.doMock("../../env", () => ({
      isBladeE2E: false,
      nodeEnv: "development",
    }));
    const { isDevelopmentReviewAudienceDefinition } =
      await import("../../utils/email/audience");

    // The restricted send records `team_members`, which is what lets
    // `processEmailSend` accept it — it refuses a hackathon audience outside
    // production and would mark every recipient failed.
    expect(
      isDevelopmentReviewAudienceDefinition([{ kind: "team_members" }]),
    ).toBe(true);
    expect(
      isDevelopmentReviewAudienceDefinition([
        { hackathonId: "h1", kind: "hackathon", statuses: ["accepted"] },
      ]),
    ).toBe(false);
  });
});
