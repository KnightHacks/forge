import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import JudgingAdminLoading from "~/app/admin/judging/loading";

describe("judging admin loading page", () => {
  it("uses the compact admin header skeleton without removed header copy", () => {
    const html = renderToStaticMarkup(<JudgingAdminLoading />);

    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("Officer command center");
    expect(html).not.toContain("Provision physical rooms");
  });
});
