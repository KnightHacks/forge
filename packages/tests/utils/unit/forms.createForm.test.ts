import { describe, expect, it } from "vitest";

import { createForm } from "@forge/utils/forms";

describe("createForm", () => {
  it("should create a form with valid input", async () => {
    const formName = `Test Form ${Date.now()}`;
    const input = {
      formData: {
        name: formName,
        description: "Test Description",
        questions: [
          {
            question: "name",
            type: "SHORT_ANSWER" as const,
            optional: false,
          },
        ],
      },
      duesOnly: false,
      allowResubmission: false,
      allowEdit: false,
    };

    const form = await createForm(input);

    expect(form).toBeDefined();
    expect(form.name).toBe(formName);
    expect(form.slugName).toBe(formName.toLowerCase().replaceAll(" ", "-"));
    expect(form.formValidatorJson).toBeDefined();
    expect(form.id).toBeDefined();
  });

  it("should create form with General section when section is not provided", async () => {
    const input = {
      formData: {
        name: `General Form ${Date.now()}`,
        description: "Description",
        questions: [
          {
            question: "test",
            type: "SHORT_ANSWER" as const,
          },
        ],
      },
      duesOnly: false,
      allowResubmission: false,
      allowEdit: false,
    };

    const form = await createForm(input);

    expect(form.sectionId).toBeNull();
  });

  it("should throw error for invalid form data", async () => {
    const input = {
      formData: {
        name: "Invalid Form",
        description: "Description",
        questions: [
          {
            question: "test",
            type: "MULTIPLE_CHOICE" as const,
            // Missing required options
          },
        ],
      },
      duesOnly: false,
      allowResubmission: false,
      allowEdit: false,
    };

    await expect(createForm(input)).rejects.toThrow();
  });

  it("should generate correct slug from form name", async () => {
    const uniqueName = `My Test Form Name ${Date.now()}`;
    const input = {
      formData: {
        name: uniqueName,
        description: "Description",
        questions: [
          {
            question: "test",
            type: "SHORT_ANSWER" as const,
          },
        ],
      },
      duesOnly: false,
      allowResubmission: false,
      allowEdit: false,
    };

    const form = await createForm(input);

    expect(form.slugName).toBe(uniqueName.toLowerCase().replaceAll(" ", "-"));
  });

  it("should handle form with multiple questions", async () => {
    const input = {
      formData: {
        name: `Multi Question Form ${Date.now()}`,
        description: "Description",
        questions: [
          {
            question: "name",
            type: "SHORT_ANSWER" as const,
          },
          {
            question: "email",
            type: "EMAIL" as const,
          },
          {
            question: "age",
            type: "NUMBER" as const,
            optional: true,
          },
        ],
      },
      duesOnly: false,
      allowResubmission: false,
      allowEdit: false,
    };

    const form = await createForm(input);

    expect(form).toBeDefined();
    expect(form.formValidatorJson).toBeDefined();
  });
});
