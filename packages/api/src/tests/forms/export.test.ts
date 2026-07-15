import { describe, expect, it } from "vitest";

import { serializeFormResponsesCsv } from "../../utils/forms/export";

const FIRST_QUESTION_ID = "00000000-0000-4000-8000-000000000601";
const SECOND_QUESTION_ID = "00000000-0000-4000-8000-000000000602";

describe("form response CSV", () => {
  it("[TC-027] is stable, identified, snapshot-labeled, array-safe, escaped, and formula-neutral", () => {
    const csv = serializeFormResponsesCsv({
      definition: {
        questions: [
          {
            id: FIRST_QUESTION_ID,
            prompt: "Current first",
            type: "short_text",
          },
          { id: SECOND_QUESTION_ID, prompt: "Topics", type: "checkboxes" },
        ],
      },
      responses: [
        {
          answers: {
            [FIRST_QUESTION_ID]:
              '=HYPERLINK("https://evil.test","click")\nsecond line',
            [SECOND_QUESTION_ID]: [
              { kind: "option", label: "Web, mobile", value: "web" },
              { kind: "other", text: 'C++ "systems"' },
            ],
          },
          id: "response-1",
          member: {
            email: "lenny@example.test",
            id: "member-1",
            name: "+Lenny Formula",
          },
          snapshot: {
            questions: [
              {
                id: FIRST_QUESTION_ID,
                prompt: "Historical first question",
                type: "short_text",
              },
              { id: SECOND_QUESTION_ID, prompt: "Topics", type: "checkboxes" },
            ],
          },
          status: "submitted",
          submittedAt: new Date("2026-07-15T18:00:00.000Z"),
        },
      ],
    });

    expect(csv).toBe(
      [
        "Response ID,Member ID,Member name,Member email,Submitted at,Status,Historical first question,Topics",
        'response-1,member-1,\'+Lenny Formula,lenny@example.test,2026-07-15T18:00:00.000Z,submitted,"\'=HYPERLINK(""https://evil.test"",""click"")\nsecond line","Web, mobile | C++ ""systems"""',
      ].join("\r\n"),
    );
    expect(csv).not.toMatch(/(?:^|,)=(?:HYPERLINK|IMPORT)/m);
    expect(csv).not.toMatch(/(?:^|,)\+Lenny/m);
  });

  it("[TC-027] follows stable definition order rather than answer object order", () => {
    const csv = serializeFormResponsesCsv({
      definition: {
        questions: [
          { id: FIRST_QUESTION_ID, prompt: "First", type: "short_text" },
          { id: SECOND_QUESTION_ID, prompt: "Second", type: "short_text" },
        ],
      },
      responses: [
        {
          answers: {
            [SECOND_QUESTION_ID]: "second answer",
            [FIRST_QUESTION_ID]: "first answer",
          },
          id: "response-1",
          member: {
            email: "member@example.test",
            id: "member-1",
            name: "Member One",
          },
          snapshot: {
            questions: [
              { id: FIRST_QUESTION_ID, prompt: "First", type: "short_text" },
              { id: SECOND_QUESTION_ID, prompt: "Second", type: "short_text" },
            ],
          },
          status: "submitted",
          submittedAt: new Date("2026-07-15T18:00:00.000Z"),
        },
      ],
    });

    expect(csv.split("\r\n")[0]).toMatch(/,First,Second$/);
    expect(csv.split("\r\n")[1]).toMatch(/,first answer,second answer$/);
  });

  it("[TC-027] neutralizes formulas hidden behind leading whitespace", () => {
    const csv = serializeFormResponsesCsv({
      definition: {
        questions: [
          { id: FIRST_QUESTION_ID, prompt: "Answer", type: "short_text" },
        ],
      },
      responses: [
        {
          answers: { [FIRST_QUESTION_ID]: '\t =IMPORTXML("x")' },
          id: "response-1",
          member: {
            email: "member@example.test",
            id: "member-1",
            name: "Member One",
          },
          snapshot: {
            questions: [
              {
                id: FIRST_QUESTION_ID,
                prompt: "Answer",
                type: "short_text",
              },
            ],
          },
          status: "submitted",
          submittedAt: new Date("2026-07-15T18:00:00.000Z"),
        },
      ],
    });

    expect(csv.split("\r\n")[1]).toContain("'\t =IMPORTXML");
  });
});
