import { describe, expect, it } from "vitest";

import {
  catalogValue,
  formatCatalogValueAudit,
  inspectCatalogValues,
} from "../forms/catalog-audit";

/** Matches the platform shape: a preset-catalog choice question. */
function presetForm(id: string, name: string) {
  return {
    formData: {
      questions: [
        {
          id: "q-heard",
          optionSource: "preset",
          presetCatalogId: "EVENT_FEEDBACK_HEARD",
          type: "multiple_choice",
        },
      ],
    },
    id,
    name,
  };
}

function response(form: string, answer: unknown) {
  return { form, responseData: { "q-heard": answer }, responseSnapshot: {} };
}

describe("catalogValue data audit", () => {
  it("finds answers whose stored value disagrees with the current slug rule", () => {
    const audit = inspectCatalogValues({
      forms: [presetForm("form-a", "Event Feedback")],
      responses: [
        // Written by the current implementation.
        response("form-a", {
          kind: "option",
          label: "Word of mouth",
          value: "word-of-mouth",
        }),
        // Written by a divergent implementation, twice.
        response("form-a", {
          kind: "option",
          label: "Word of mouth",
          value: "word_of_mouth",
        }),
        response("form-a", {
          kind: "option",
          label: "Word of mouth",
          value: "word_of_mouth",
        }),
      ],
    });

    expect(catalogValue("Word of mouth")).toBe("word-of-mouth");
    expect(audit.totals.checked).toBe(3);
    expect(audit.totals.mismatched).toBe(2);
    expect(audit.forms[0]?.mismatches).toEqual([
      {
        catalogId: "EVENT_FEEDBACK_HEARD",
        count: 2,
        expected: "word-of-mouth",
        label: "Word of mouth",
        stored: "word_of_mouth",
      },
    ]);
  });

  it("counts checkbox selections individually", () => {
    const audit = inspectCatalogValues({
      forms: [presetForm("form-a", "Event Feedback")],
      responses: [
        response("form-a", [
          { kind: "option", label: "Discord", value: "discord" },
          { kind: "option", label: "Reddit", value: "REDDIT" },
        ]),
      ],
    });

    expect(audit.totals.checked).toBe(2);
    expect(audit.totals.mismatched).toBe(1);
  });

  it("separates answers it cannot judge from answers that agree", () => {
    const audit = inspectCatalogValues({
      forms: [
        presetForm("form-a", "Event Feedback"),
        {
          formData: {
            questions: [
              {
                id: "q-manual",
                optionSource: "manual",
                type: "dropdown",
              },
            ],
          },
          id: "form-b",
          name: "Manual Options",
        },
      ],
      responses: [
        // Pre-platform rows store the label itself, not a derived value.
        response("form-a", "Discord"),
        // No label to recompute from.
        response("form-a", { kind: "option", value: "discord" }),
        // Label left the catalog, so the catalog moved rather than the rule.
        response("form-a", {
          kind: "option",
          label: "Retired source",
          value: "retired-source",
        }),
        // Free-text `other` answers are never inspected.
        response("form-a", { kind: "other", text: "my roommate told me" }),
        // Manual-option values are author-supplied, so they are out of scope.
        {
          form: "form-b",
          responseData: { "q-manual": "x" },
          responseSnapshot: {},
        },
      ],
    });

    expect(audit.totals).toEqual({
      checked: 0,
      mismatched: 0,
      preplatform: 1,
      responses: 5,
      responsesOutOfScope: 1,
      unlabeled: 1,
      unrecognized: 1,
    });
  });

  it("reports a database with nothing to check as inconclusive, not clean", () => {
    const report = formatCatalogValueAudit(
      inspectCatalogValues({
        forms: [presetForm("form-a", "Event Feedback")],
        responses: [response("form-a", "Discord")],
      }),
    );

    expect(report).toContain("Inconclusive");
    expect(report).not.toContain("No mismatches");
  });

  it("never prints a stored value that is not slug-shaped", () => {
    const report = formatCatalogValueAudit(
      inspectCatalogValues({
        forms: [presetForm("form-a", "Event Feedback")],
        responses: [
          response("form-a", {
            kind: "option",
            label: "Discord",
            value: "member@example.com",
          }),
        ],
      }),
    );

    expect(report).toContain("<non-slug value>");
    expect(report).not.toContain("member@example.com");
  });
});
