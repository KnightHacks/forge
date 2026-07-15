import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FormResponseAnswer } from "~/app/_components/forms/form-response-answer";

describe("FormResponseAnswer", () => {
  it("TC-013 renders a stable Other category and preserves the exact raw answer", () => {
    const html = renderToStaticMarkup(
      createElement(FormResponseAnswer, {
        answer: {
          kind: "other" as const,
          optionId: "00000000-0000-4000-8000-000000001301",
          value: "Robotics, R&D & friends",
        },
        questionLabel: "How did you hear about us?",
        questionType: "multiple_choice" as const,
      }),
    );

    expect(html).toContain("Other");
    expect((html.match(/Other/g) ?? []).length).toBe(1);
    expect(html).toContain("Robotics, R&amp;D &amp; friends");
    expect(html).not.toContain("00000000-0000-4000-8000-000000001301");
    expect(html).not.toContain("__other__");
  });
});
