import type { JSONSchema7 } from "json-schema";

type QuestionType =
  | "SHORT_ANSWER"
  | "PARAGRAPH"
  | "MULTIPLE_CHOICE"
  | "CHECKBOXES"
  | "DROPDOWN"
  | "LINEAR_SCALE"
  | "DATE"
  | "TIME"
  | "EMAIL"
  | "NUMBER"
  | "PHONE";

interface ValidatorOptions {
  type: QuestionType;
  options?: string[];
  optional?: boolean;
  min?: number;
  max?: number;
}

export interface FormType {
  image: string;
  name: string;
  description: string;
  questions: (ValidatorOptions & { name: string })[];
}

type OptionalSchema =
  | { success: true; schema: JSONSchema7 }
  | { success: false; msg: string };

function createJsonSchemaValidator({
  type,
  options,
  min,
  max,
}: ValidatorOptions): OptionalSchema {
  const schema: JSONSchema7 = {};

  switch (type) {
    case "SHORT_ANSWER":
    case "PARAGRAPH":
      schema.type = "string";
      break;
    case "EMAIL":
      schema.type = "string";
      schema.format = "email";
      break;
    case "PHONE":
      schema.type = "string";
      schema.pattern = "^\\+?\\d{7,15}$";
      break;
    case "DATE":
      schema.type = "string";
      schema.format = "date";
      break;
    case "TIME":
      schema.type = "string";
      schema.pattern = "^([01]\\d|2[0-3]):([0-5]\\d)$";
      break;
    case "NUMBER":
    case "LINEAR_SCALE":
      schema.type = "number";
      break;
    case "MULTIPLE_CHOICE":
    case "DROPDOWN":
      if (!options?.length)
        return {
          success: false,
          msg: "Options are required for multiple choice / dropdown",
        };
      schema.type = "string";
      schema.enum = options;
      break;
    case "CHECKBOXES":
      if (!options?.length)
        return { success: false, msg: "Options required for checkboxes" };
      schema.type = "array";
      schema.items = { type: "string", enum: options };
      break;
    default:
      schema.type = "string";
  }

  if (min !== undefined) {
    if (schema.type === "string") schema.minLength = min;
    if (schema.type === "array") schema.minItems = min;
    if (schema.type === "number") schema.minimum = min;
  }

  if (max !== undefined) {
    if (schema.type === "string") schema.maxLength = max;
    if (schema.type === "array") schema.maxItems = max;
    if (schema.type === "number") schema.maximum = max;
  }

  return { success: true, schema };
}

export function generateJsonSchema(form: FormType): OptionalSchema {
  const schema: JSONSchema7 = {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  };

  const properties: Record<string, JSONSchema7> = {};
  const required: string[] = [];

  for (const question of form.questions) {
    const { name, optional, ...rest } = question;
    const convert = createJsonSchemaValidator(rest);
    if (convert.success) properties[name] = convert.schema;
    else return convert;

    if (!optional) {
      required.push(name);
    }
  }

  schema.properties = properties;
  if (required.length > 0) {
    schema.required = required;
  }

  return { success: true, schema };
}
