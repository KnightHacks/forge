import { describe, expect, it } from "vitest";

import { suppressedRecipientCount } from "~/app/_components/admin/email/email-preview-counts";

describe("suppressedRecipientCount", () => {
  it("counts blocklisted and unsubscribed recipients together", () => {
    expect(
      suppressedRecipientCount({
        excludedBlocklisted: 2,
        excludedUnsubscribed: 4,
      }),
    ).toBe(6);
  });

  it("is zero when nothing was suppressed", () => {
    expect(
      suppressedRecipientCount({
        excludedBlocklisted: 0,
        excludedUnsubscribed: 0,
      }),
    ).toBe(0);
  });

  it("does not count invalid or missing-field exclusions", () => {
    const counts = {
      duplicatesCollapsed: 3,
      excludedBlocklisted: 1,
      excludedInvalid: 9,
      excludedManual: 5,
      excludedMissingFields: 7,
      excludedUnsubscribed: 1,
      finalUnique: 20,
      rawMatches: 45,
    };
    expect(suppressedRecipientCount(counts)).toBe(2);
  });
});
