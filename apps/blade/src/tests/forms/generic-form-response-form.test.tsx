import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  GenericFormResponseForm,
  linearScaleValues,
} from "~/app/_components/forms/generic-form-response-form";

vi.mock("~/trpc/react", () => ({
  api: {
    forms: {
      createResponse: {
        useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
      },
      updateResponse: {
        useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
      },
    },
  },
}));

const definition = {
  description: "A compact mobile form.",
  instructions: [
    {
      body: "Answer each question, then submit once.",
      id: "00000000-0000-4000-8000-000000001010",
      type: "text" as const,
    },
  ],
  questions: [
    {
      id: "00000000-0000-4000-8000-000000001011",
      maxLength: 255,
      prompt: "What should we build next?",
      required: true,
      retired: false,
      type: "short_text" as const,
    },
    {
      id: "00000000-0000-4000-8000-000000001012",
      max: 5,
      min: 1,
      prompt: "How useful was this?",
      required: true,
      retired: false,
      type: "linear_scale" as const,
    },
    {
      allowOther: false,
      id: "00000000-0000-4000-8000-000000001013",
      manualOptions: [
        {
          id: "00000000-0000-4000-8000-000000001014",
          label: "Frontend",
          value: "frontend",
        },
        {
          id: "00000000-0000-4000-8000-000000001015",
          label: "Backend",
          value: "backend",
        },
      ],
      optionSource: "manual" as const,
      presetCatalogId: null,
      prompt: "Which track?",
      required: false,
      retired: false,
      type: "dropdown" as const,
    },
    {
      id: "00000000-0000-4000-8000-000000001016",
      prompt: "Phone number",
      required: false,
      retired: false,
      type: "phone" as const,
    },
  ],
  title: "Mobile form",
};

describe("GenericFormResponseForm", () => {
  it("refuses to allocate invalid or oversized linear scales", () => {
    expect(linearScaleValues(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(linearScaleValues(0, 21)).toEqual([]);
    expect(linearScaleValues(-1_001, -1_000)).toEqual([]);
    expect(linearScaleValues(1, 1_001)).toEqual([]);
  });

  it("keeps questions and the submit action phone-safe", () => {
    const html = renderToStaticMarkup(
      createElement(GenericFormResponseForm, {
        definition,
        formId: "00000000-0000-4000-8000-000000001001",
      }),
    );

    expect(html).toContain('data-form-response-layout="mobile-first"');
    expect(html).toContain('data-form-submit-bar="sticky-mobile"');
    expect(html).toContain("w-full");
    expect(html).toContain("min-w-0");
    expect(html).toContain("text-base");
    expect(html).toContain('aria-label="Which track?"');
    expect(html).toContain('<option value="frontend">Frontend</option>');
    expect(html).toContain('type="tel"');
    expect(html).toContain('inputMode="tel"');
    expect(html).toContain("Submit response");
  });
});
