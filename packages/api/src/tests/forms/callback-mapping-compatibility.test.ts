import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  assertCallbackMappingsMatchSchema,
  defineFormCallback,
} from "../../utils/forms/callbacks";

const questionId = "10000000-0000-4000-8000-000000000201";
const formDefinition = {
  description: "Apply to a team.",
  instructions: [],
  questions: [
    {
      id: questionId,
      maxLength: 500,
      prompt: "What is your graduation year?",
      required: true,
      retired: false,
      type: "short_text" as const,
    },
  ],
  title: "Team application",
};

function graduationYearCallback(
  questionTypes: readonly ["short_text" | "number"],
) {
  return defineFormCallback({
    description: "Read a graduation year from a form answer.",
    inputSchema: z.object({
      gradYear: z.coerce.number().int().min(2000).max(2200),
    }),
    inputs: {
      gradYear: { allowedSources: ["question"], questionTypes },
    },
    label: "Read graduation year",
    requiredPermission: "EDIT_FORMS",
    slug: "test.graduation-year",
  });
}

function validate(questionTypes: readonly ["short_text" | "number"]) {
  assertCallbackMappingsMatchSchema({
    definition: graduationYearCallback(questionTypes),
    formDefinition,
    mappings: [
      {
        inputKey: "gradYear",
        source: { kind: "question", questionId },
      },
    ],
  });
}

describe("form callback question compatibility", () => {
  it("accepts explicitly compatible question types for constrained inputs", () => {
    expect(() => validate(["short_text"])).not.toThrow();
  });

  it("rejects question types outside the explicit callback metadata", () => {
    expect(() => validate(["number"])).toThrow(
      /does not allow short_text questions/i,
    );
  });
});
