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
      // Branches on attachmentId so one render can cover the loading, error,
      // and success states InstructionMedia renders for TC-018.
      getAttachmentDownload: {
        useQuery: ({ attachmentId }: { attachmentId: string }) => {
          if (attachmentId === "att-pending")
            return { data: undefined, isError: false, isPending: true };
          if (attachmentId === "att-broken")
            return { data: undefined, isError: true, isPending: false };
          return {
            data: { url: `https://cdn.test/${attachmentId}` },
            isError: false,
            isPending: false,
          };
        },
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
      maxLength: 750,
      prompt: "What else should we know?",
      required: false,
      retired: false,
      type: "paragraph" as const,
    },
    {
      id: "00000000-0000-4000-8000-000000001017",
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

  it("renders labelled question controls and the submit action", () => {
    const html = renderToStaticMarkup(
      createElement(GenericFormResponseForm, {
        definition,
        formId: "00000000-0000-4000-8000-000000001001",
      }),
    );

    expect(html).toContain('aria-label="Which track?"');
    expect(html).toContain('<option value="frontend">Frontend</option>');
    expect(html).toContain('type="tel"');
    expect(html).toContain('inputMode="tel"');
    expect(html).toContain("Submit response");
  });

  it("[TC-001] renders whitespace-aware text counters without raw HTML limits", () => {
    const html = renderToStaticMarkup(
      createElement(GenericFormResponseForm, {
        definition,
        formId: "00000000-0000-4000-8000-000000001001",
        initialAnswers: {
          "00000000-0000-4000-8000-000000001011": "a b\tc",
          "00000000-0000-4000-8000-000000001012": "x\ny z",
        },
      }),
    );

    expect(html).toContain("3 / 255 non-whitespace characters");
    expect(html).toContain("3 / 750 non-whitespace characters");
    expect(html.toLowerCase()).not.toContain("maxlength=");
  });

  it("[TC-NEG-001] marks a text response above its non-whitespace limit", () => {
    const limitedDefinition = {
      ...definition,
      questions: definition.questions.map((question) =>
        question.type === "short_text"
          ? { ...question, maxLength: 3 }
          : question,
      ),
    };
    const html = renderToStaticMarkup(
      createElement(GenericFormResponseForm, {
        definition: limitedDefinition,
        formId: "00000000-0000-4000-8000-000000001001",
        initialAnswers: {
          "00000000-0000-4000-8000-000000001011": "a b c d",
        },
      }),
    );

    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("4 / 3 non-whitespace characters");
    expect(html).toContain("text-destructive");
  });

  it("[TC-018] renders image and video instruction media in their loading, failure, and success states", () => {
    const mediaDefinition = {
      ...definition,
      instructions: [
        ...definition.instructions,
        {
          alt: "Event flyer",
          attachmentId: "att-image",
          id: "00000000-0000-4000-8000-000000001018",
          type: "image" as const,
        },
        {
          alt: "Loading walkthrough",
          attachmentId: "att-pending",
          id: "00000000-0000-4000-8000-000000001019",
          type: "video" as const,
        },
        {
          alt: "Broken walkthrough",
          attachmentId: "att-broken",
          id: "00000000-0000-4000-8000-000000001020",
          type: "video" as const,
        },
      ],
    };

    const html = renderToStaticMarkup(
      createElement(GenericFormResponseForm, {
        definition: mediaDefinition,
        formId: "00000000-0000-4000-8000-000000001001",
      }),
    );

    expect(html).toContain('src="https://cdn.test/att-image"');
    expect(html).toContain('alt="Event flyer"');
    expect(html).toContain(
      'aria-label="Instruction media loading" aria-busy="true"',
    );
    expect(html).toContain("Instruction media could not be loaded.");
  });
});
