import { describe, expect, it } from "vitest";

import {
  callbackConfigurationSchema,
  FORM_LINEAR_SCALE_ENDPOINT_MAX,
  FORM_LINEAR_SCALE_ENDPOINT_MIN,
  FORM_LINEAR_SCALE_MAX_SPAN,
  FORM_UPLOAD_MAX_BYTES,
  formDefinitionSchema,
  formResponseInputSchema,
  getFormAvailability,
  isFormStateTransitionAllowed,
  validateFormAnswers,
  validateFormUpload,
} from "../forms-platform";

const ids = {
  boolean: "00000000-0000-4000-8000-000000000001",
  checkbox: "00000000-0000-4000-8000-000000000002",
  date: "00000000-0000-4000-8000-000000000003",
  dropdown: "00000000-0000-4000-8000-000000000004",
  email: "00000000-0000-4000-8000-000000000005",
  file: "00000000-0000-4000-8000-000000000006",
  linear: "00000000-0000-4000-8000-000000000007",
  link: "00000000-0000-4000-8000-000000000008",
  multiple: "00000000-0000-4000-8000-000000000009",
  number: "00000000-0000-4000-8000-000000000010",
  paragraph: "00000000-0000-4000-8000-000000000011",
  phone: "00000000-0000-4000-8000-000000000012",
  short: "00000000-0000-4000-8000-000000000013",
  time: "00000000-0000-4000-8000-000000000014",
};

const optionIds = {
  first: "10000000-0000-4000-8000-000000000001",
  second: "10000000-0000-4000-8000-000000000002",
};

const baseDefinition = {
  description: "A complete form definition",
  instructions: [],
  questions: [
    {
      id: ids.short,
      maxLength: 120,
      prompt: "Short",
      required: true,
      retired: false,
      type: "short_text",
    },
    {
      id: ids.paragraph,
      maxLength: 2000,
      prompt: "Paragraph",
      required: false,
      retired: false,
      type: "paragraph",
    },
    {
      allowOther: true,
      id: ids.multiple,
      manualOptions: [
        { id: optionIds.first, label: "First", value: "first" },
        { id: optionIds.second, label: "Second", value: "second" },
      ],
      optionSource: "manual",
      presetCatalogId: null,
      prompt: "One",
      required: true,
      retired: false,
      type: "multiple_choice",
    },
    {
      allowOther: true,
      id: ids.checkbox,
      manualOptions: [
        { id: optionIds.first, label: "First", value: "first" },
        { id: optionIds.second, label: "Second", value: "second" },
      ],
      optionSource: "manual",
      presetCatalogId: null,
      prompt: "Many",
      required: true,
      retired: false,
      type: "checkboxes",
    },
    {
      allowOther: false,
      id: ids.dropdown,
      manualOptions: [
        { id: optionIds.first, label: "First", value: "first" },
        { id: optionIds.second, label: "Second", value: "second" },
      ],
      optionSource: "manual",
      presetCatalogId: null,
      prompt: "Dropdown",
      required: true,
      retired: false,
      type: "dropdown",
    },
    {
      allowedMimeTypes: ["application/pdf"],
      id: ids.file,
      maxBytes: FORM_UPLOAD_MAX_BYTES,
      prompt: "File",
      required: true,
      retired: false,
      type: "file",
    },
    {
      id: ids.linear,
      max: 5,
      min: 1,
      prompt: "Scale",
      required: true,
      retired: false,
      type: "linear_scale",
    },
    {
      id: ids.date,
      prompt: "Date",
      required: true,
      retired: false,
      type: "date",
    },
    {
      id: ids.time,
      prompt: "Time",
      required: true,
      retired: false,
      type: "time",
    },
    {
      id: ids.email,
      prompt: "Email",
      required: true,
      retired: false,
      type: "email",
    },
    {
      id: ids.number,
      max: 100,
      min: 0,
      prompt: "Number",
      required: true,
      retired: false,
      type: "number",
    },
    {
      id: ids.phone,
      prompt: "Phone",
      required: true,
      retired: false,
      type: "phone",
    },
    {
      id: ids.boolean,
      prompt: "Boolean",
      required: true,
      retired: false,
      type: "boolean",
    },
    {
      id: ids.link,
      prompt: "Link",
      required: true,
      retired: false,
      type: "link",
    },
  ],
  title: "Complete form",
};

describe("forms platform definition and runtime validation", () => {
  it("[TC-012] accepts all fourteen supported question families", () => {
    const result = formDefinitionSchema.safeParse(baseDefinition);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(new Set(result.data.questions.map(({ type }) => type))).toEqual(
      new Set([
        "short_text",
        "paragraph",
        "multiple_choice",
        "checkboxes",
        "dropdown",
        "file",
        "linear_scale",
        "date",
        "time",
        "email",
        "number",
        "phone",
        "boolean",
        "link",
      ]),
    );
  });

  it("[TC-012, TC-013] validates answers by question ID and preserves Other exactly", () => {
    const answers = validateFormAnswers(baseDefinition, [
      { questionId: ids.short, value: "Lenny" },
      { questionId: ids.paragraph, value: "Useful notes" },
      {
        questionId: ids.multiple,
        value: { kind: "other", text: "iOS / C++" },
      },
      {
        questionId: ids.checkbox,
        value: [
          { kind: "option", value: "first" },
          { kind: "other", text: "ACM SIGGRAPH" },
        ],
      },
      {
        questionId: ids.dropdown,
        value: { kind: "option", value: "second" },
      },
      {
        questionId: ids.file,
        value: { attachmentId: "20000000-0000-4000-8000-000000000001" },
      },
      { questionId: ids.linear, value: 5 },
      { questionId: ids.date, value: "2026-07-15" },
      { questionId: ids.time, value: "18:30" },
      { questionId: ids.email, value: "member@example.com" },
      { questionId: ids.number, value: 42 },
      { questionId: ids.phone, value: "+1 (407) 555-1212" },
      { questionId: ids.boolean, value: true },
      { questionId: ids.link, value: "https://knighthacks.org/forms" },
    ]);

    expect(answers[ids.multiple]).toEqual({
      kind: "other",
      text: "iOS / C++",
    });
    expect(answers[ids.checkbox]).toContainEqual({
      kind: "other",
      text: "ACM SIGGRAPH",
    });
  });

  it("[TC-NEG-004] rejects duplicate keys, inactive options, sentinels, and empty Other", () => {
    const duplicate = formResponseInputSchema.safeParse({
      answers: [
        { questionId: ids.short, value: "one" },
        { questionId: ids.short, value: "two" },
      ],
      formId: "30000000-0000-4000-8000-000000000001",
    });
    expect(duplicate.success).toBe(false);

    for (const value of [
      { kind: "option", value: "removed" },
      { kind: "other", text: "" },
      "__OTHER__",
    ]) {
      expect(() =>
        validateFormAnswers(
          {
            ...baseDefinition,
            questions: [baseDefinition.questions[2]],
          },
          [{ questionId: ids.multiple, value }],
        ),
      ).toThrow();
    }
  });

  it("[TC-016] permits a removed option only when preserving an unchanged historical answer", () => {
    const definition = {
      ...baseDefinition,
      questions: [baseDefinition.questions[4]],
    };
    const answer = {
      questionId: ids.dropdown,
      value: { kind: "option" as const, value: "removed" },
    };

    expect(() => validateFormAnswers(definition, [answer])).toThrow();
    expect(
      validateFormAnswers(definition, [answer], {
        preservedAnswers: { [ids.dropdown]: answer.value },
      }),
    ).toEqual({ [ids.dropdown]: answer.value });
  });
});

describe("forms platform state, availability, callbacks, and uploads", () => {
  it("[TC-006] allows only Draft to Published and Published/Archived toggling", () => {
    expect(isFormStateTransitionAllowed("draft", "published")).toBe(true);
    expect(isFormStateTransitionAllowed("published", "archived")).toBe(true);
    expect(isFormStateTransitionAllowed("archived", "published")).toBe(true);

    expect(isFormStateTransitionAllowed("published", "draft")).toBe(false);
    expect(isFormStateTransitionAllowed("archived", "draft")).toBe(false);
    expect(isFormStateTransitionAllowed("draft", "archived")).toBe(false);
  });

  it("[TC-020] distinguishes scheduled, open, closed, manual, draft, and archived states", () => {
    const now = new Date("2026-07-15T18:00:00.000Z");
    const common = {
      closesAt: new Date("2026-07-16T18:00:00.000Z"),
      manuallyClosed: false,
      opensAt: new Date("2026-07-14T18:00:00.000Z"),
      state: "published" as const,
    };

    expect(getFormAvailability(common, now)).toBe("open");
    expect(
      getFormAvailability(
        { ...common, opensAt: new Date("2026-07-16T18:00:00.000Z") },
        now,
      ),
    ).toBe("scheduled");
    expect(
      getFormAvailability(
        { ...common, closesAt: new Date("2026-07-14T18:00:00.000Z") },
        now,
      ),
    ).toBe("closed");
    expect(getFormAvailability({ ...common, manuallyClosed: true }, now)).toBe(
      "manually_closed",
    );
    expect(getFormAvailability({ ...common, state: "draft" }, now)).toBe(
      "draft",
    );
    expect(getFormAvailability({ ...common, state: "archived" }, now)).toBe(
      "archived",
    );
  });

  it("[TC-030, TC-031] validates typed callback mappings and requires a locked response mode", () => {
    const configured = callbackConfigurationSchema.parse({
      callbackSlug: "discord.assign-role",
      mappings: [
        {
          inputKey: "roleId",
          source: { kind: "fixed", value: "role-safe-id" },
        },
        {
          inputKey: "reason",
          source: { kind: "question", questionId: ids.short },
        },
        {
          inputKey: "memberId",
          source: { kind: "system", value: "member_id" },
        },
      ],
      responseMode: "single_locked",
    });

    expect(configured.mappings).toHaveLength(3);
    expect(
      callbackConfigurationSchema.safeParse({
        ...configured,
        responseMode: "single_editable",
      }).success,
    ).toBe(false);
  });

  it("[TC-023, TC-NEG-005] applies the 100 MB safe upload policy", () => {
    expect(FORM_UPLOAD_MAX_BYTES).toBe(100 * 1024 * 1024);
    expect(
      validateFormUpload({
        contentType: "application/pdf",
        fileName: "resume.pdf",
        size: FORM_UPLOAD_MAX_BYTES,
      }),
    ).toEqual({ allowed: true });
    expect(
      validateFormUpload({
        contentType: "application/x-msdownload",
        fileName: "payload.exe",
        size: 512,
      }),
    ).toEqual({ allowed: false, reason: "unsafe_type" });
    expect(
      validateFormUpload({
        contentType: "application/pdf",
        fileName: "huge.pdf",
        size: FORM_UPLOAD_MAX_BYTES + 1,
      }),
    ).toEqual({ allowed: false, reason: "too_large" });
  });

  it("[TC-016] validates new answers against the live preset catalog", () => {
    const questionId = "00000000-0000-4000-8000-000000000099";
    const definition = {
      description: "",
      instructions: [],
      questions: [
        {
          allowOther: false,
          id: questionId,
          manualOptions: [],
          optionSource: "preset" as const,
          presetCatalogId: "MAJORS",
          prompt: "Major",
          required: true,
          retired: false,
          type: "dropdown" as const,
        },
      ],
      title: "Profile",
    };

    expect(
      validateFormAnswers(definition, [
        {
          questionId,
          value: { kind: "option", value: "computer-science" },
        },
      ]),
    ).toEqual({
      [questionId]: {
        kind: "option",
        label: "Computer Science",
        value: "computer-science",
      },
    });
  });

  it("bounds linear-scale endpoints and span before respondent rendering", () => {
    const scale = baseDefinition.questions.find(
      (question) => question.type === "linear_scale",
    );
    if (!scale) {
      throw new Error("Linear-scale fixture is missing.");
    }

    for (const [min, max] of [
      [FORM_LINEAR_SCALE_ENDPOINT_MIN - 1, 5],
      [1, FORM_LINEAR_SCALE_ENDPOINT_MAX + 1],
      [1, 1 + FORM_LINEAR_SCALE_MAX_SPAN + 1],
    ] as const) {
      expect(
        formDefinitionSchema.safeParse({
          ...baseDefinition,
          questions: baseDefinition.questions.map((question) =>
            question.id === scale.id ? { ...scale, max, min } : question,
          ),
        }).success,
      ).toBe(false);
    }

    const largestAllowed = formDefinitionSchema.safeParse({
      ...baseDefinition,
      questions: baseDefinition.questions.map((question) =>
        question.id === scale.id
          ? {
              ...scale,
              max: 1 + FORM_LINEAR_SCALE_MAX_SPAN,
              min: 1,
            }
          : question,
      ),
    });
    expect(largestAllowed.success).toBe(true);
  });
});
