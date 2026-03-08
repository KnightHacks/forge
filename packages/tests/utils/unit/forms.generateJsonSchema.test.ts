import { describe, expect, it } from "vitest";

import { FORMS } from "@forge/consts";
import * as forms from "@forge/utils/forms";

describe("generateJsonSchema", () => {
  it("should generate schema for SHORT_ANSWER field", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "What is your name?",
          type: "SHORT_ANSWER",
          optional: false,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.schema.type).toBe("object");
      expect(result.schema.properties?.["What is your name?"]).toEqual({
        type: "string",
        maxLength: 150,
      });
      expect(result.schema.required).toContain("What is your name?");
    }
  });

  it("should generate schema for PARAGRAPH field with default maxLength", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Tell us about yourself",
          type: "PARAGRAPH",
          optional: true,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.schema.properties?.["Tell us about yourself"]).toEqual({
        type: "string",
        maxLength: 750,
      });
      expect(result.schema.required).not.toContain("Tell us about yourself");
    }
  });

  it("should generate schema for EMAIL field", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Email address",
          type: "EMAIL",
          optional: false,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.schema.properties?.["Email address"]).toEqual({
        type: "string",
        format: "email",
      });
    }
  });

  it("should generate schema for PHONE field", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Phone number",
          type: "PHONE",
          optional: false,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.schema.properties?.["Phone number"]).toEqual({
        type: "string",
        pattern: "^\\+?\\d{7,15}$",
      });
    }
  });

  it("should generate schema for DATE field", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Birth date",
          type: "DATE",
          optional: false,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.schema.properties?.["Birth date"]).toEqual({
        type: "string",
        format: "date",
      });
    }
  });

  it("should generate schema for TIME field", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Preferred time",
          type: "TIME",
          optional: false,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.schema.properties?.["Preferred time"]).toEqual({
        type: "string",
        pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$",
      });
    }
  });

  it("should generate schema for NUMBER field", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Age",
          type: "NUMBER",
          optional: false,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.schema.properties?.["Age"]).toEqual({
        type: "number",
      });
    }
  });

  it("should generate schema for MULTIPLE_CHOICE with options", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Choose one",
          type: "MULTIPLE_CHOICE",
          options: ["Option 1", "Option 2", "Option 3"],
          optional: false,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.schema.properties?.["Choose one"]).toEqual({
        type: "string",
        enum: ["Option 1", "Option 2", "Option 3"],
      });
    }
  });

  it("should fail for MULTIPLE_CHOICE without options", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Choose one",
          type: "MULTIPLE_CHOICE",
          optional: false,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.msg).toBe(
        "Options are required for multiple choice / dropdown",
      );
    }
  });

  it("should generate schema for CHECKBOXES with options", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Select all that apply",
          type: "CHECKBOXES",
          options: ["Option A", "Option B"],
          optional: false,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.schema.properties?.["Select all that apply"]).toEqual({
        type: "array",
        items: { type: "string", enum: ["Option A", "Option B"] },
        minItems: 1,
      });
    }
  });

  it("should fail for CHECKBOXES without options", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Select all",
          type: "CHECKBOXES",
          optional: false,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.msg).toBe("Options required for checkboxes");
    }
  });

  it("should generate schema for BOOLEAN field", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Do you agree?",
          type: "BOOLEAN",
          optional: false,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.schema.properties?.["Do you agree?"]).toEqual({
        type: "boolean",
      });
    }
  });

  it("should generate schema for LINK field", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Website URL",
          type: "LINK",
          optional: false,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.schema.properties?.["Website URL"]).toEqual({
        type: "string",
        format: "uri",
      });
    }
  });

  it("should handle min/max constraints for string fields", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Short answer",
          type: "SHORT_ANSWER",
          min: 5,
          max: 50,
          optional: false,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.schema.properties?.["Short answer"]).toEqual({
        type: "string",
        minLength: 5,
        maxLength: 50,
      });
    }
  });

  it("should handle min/max constraints for number fields", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Rating",
          type: "NUMBER",
          min: 1,
          max: 10,
          optional: false,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.schema.properties?.["Rating"]).toEqual({
        type: "number",
        minimum: 1,
        maximum: 10,
      });
    }
  });

  it("should handle min/max constraints for array fields", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Select items",
          type: "CHECKBOXES",
          options: ["A", "B", "C"],
          min: 2,
          max: 3,
          optional: false,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.schema.properties?.["Select items"]).toEqual({
        type: "array",
        items: { type: "string", enum: ["A", "B", "C"] },
        minItems: 2,
        maxItems: 3,
      });
    }
  });

  it("should handle allowOther for MULTIPLE_CHOICE", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Choose or other",
          type: "MULTIPLE_CHOICE",
          options: ["Option 1", "Option 2"],
          allowOther: true,
          optional: false,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(true);
    if (result.success) {
      // When allowOther is true, enum is not set
      expect(result.schema.properties?.["Choose or other"]).toEqual({
        type: "string",
      });
      expect(
        result.schema.properties?.["Choose or other"].enum,
      ).toBeUndefined();
    }
  });

  it("should handle allowOther for CHECKBOXES", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Select or other",
          type: "CHECKBOXES",
          options: ["A", "B"],
          allowOther: true,
          optional: false,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.schema.properties?.["Select or other"]).toEqual({
        type: "array",
        items: { type: "string" },
        minItems: 1,
      });
      expect(
        result.schema.properties?.["Select or other"].items.enum,
      ).toBeUndefined();
    }
  });

  it("should generate schema for form with multiple questions", () => {
    const form: FORMS.FormType = {
      name: "Test Form",
      description: "Test description",
      questions: [
        {
          question: "Name",
          type: "SHORT_ANSWER",
          optional: false,
        },
        {
          question: "Email",
          type: "EMAIL",
          optional: false,
        },
        {
          question: "Comments",
          type: "PARAGRAPH",
          optional: true,
        },
      ],
    };

    const result = forms.generateJsonSchema(form);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.schema.properties || {})).toHaveLength(3);
      expect(result.schema.required).toEqual(["Name", "Email"]);
      expect(result.schema.required).not.toContain("Comments");
    }
  });
});
