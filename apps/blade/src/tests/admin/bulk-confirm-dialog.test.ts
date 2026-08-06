import { describe, expect, it } from "vitest";

import { skipLabel } from "~/app/_components/admin/hackathon/hackers/bulk-confirm-dialog";

describe("bulk hacker status skip labels", () => {
  it("explains that checked-in admission is permanent", () => {
    expect(skipLabel("checked_in")).toBe("Already checked into this hackathon");
  });

  it("keeps an old tab readable after an unknown reason ships", () => {
    expect(skipLabel("future_reason")).toBe("Skipped — reload for details");
  });
});
