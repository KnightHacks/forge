import { describe, expect, it } from "vitest";

import { projectForJudge } from "../../utils/projects/view";

describe("judge project view", () => {
  it("removes participant emails and schools without changing names", () => {
    const result = projectForJudge({
      id: "project-1",
      members: [
        {
          email: "captain@example.test",
          id: "member-1",
          name: "Casey Captain",
          order: 0,
        },
      ],
      title: "Signal Forge",
      universities: ["University of Central Florida"],
    });

    expect(result).toEqual({
      id: "project-1",
      members: [{ name: "Casey Captain" }],
      title: "Signal Forge",
    });
    expect(JSON.stringify(result)).not.toContain("captain@example.test");
    expect(JSON.stringify(result)).not.toContain(
      "University of Central Florida",
    );
  });
});
