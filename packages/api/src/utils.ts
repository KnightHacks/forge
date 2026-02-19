import type { JSONSchema7 } from "json-schema";
import { TRPCError } from "@trpc/server";
import { google } from "googleapis";
import z from "zod";

import type { Form } from "@forge/db/schemas/knight-hacks";
import { EVENTS, FORMS, MINIO } from "@forge/consts";
import { db } from "@forge/db/client";
import { FormSchemaSchema, FormsSchemas } from "@forge/db/schemas/knight-hacks";
import { client } from "@forge/email";

import { env } from "./env";
import { minioClient } from "./minio/minio-client";

export const sendEmail = async ({
  to,
  subject,
  template_id,
  from,
  data,
}: {
  to: string | string[];
  subject: string;
  template_id: number;
  data: Record<string, string>;
  from?: string;
}): Promise<{ success: true }> => {
  try {
    await client.tx.send({
      template_id: template_id,
      from_email: from ?? env.LISTMONK_FROM_EMAIL,
      subscriber_mode: "external",
      subscriber_emails: typeof to === "string" ? [to] : to,
      subject: subject,
      data: data,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(
      `Failed to send email: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
};

const GOOGLE_PRIVATE_KEY = Buffer.from(env.GOOGLE_PRIVATE_KEY_B64, "base64")
  .toString("utf-8")
  .replace(/\\n/g, "\n");

const gapiCalendar = "https://www.googleapis.com/auth/calendar";
const gapiGmailSend = "https://www.googleapis.com/auth/gmail.send";
const gapiGmailSettingsSharing =
  "https://www.googleapis.com/auth/gmail.settings.sharing";

const auth = new google.auth.JWT(
  env.GOOGLE_CLIENT_EMAIL,
  undefined,
  GOOGLE_PRIVATE_KEY,
  [gapiCalendar, gapiGmailSend, gapiGmailSettingsSharing],
  EVENTS.GOOGLE_PERSONIFY_EMAIL as string,
);

export const gmail = google.gmail({
  version: "v1",
  auth: auth,
});

export const calendar = google.calendar({
  version: "v3",
  auth: auth,
});

type OptionalSchema =
  | { success: true; schema: JSONSchema7 }
  | { success: false; msg: string };

function createJsonSchemaValidator({
  optional,
  type,
  options,
  optionsConst,
  min,
  max,
  allowOther,
}: FORMS.ValidatorOptions): OptionalSchema {
  const schema: JSONSchema7 = {};

  const resolvedOptions = optionsConst
    ? [...FORMS.getDropdownOptionsFromConst(optionsConst)]
    : options;

  switch (type) {
    case "SHORT_ANSWER":
    case "PARAGRAPH":
      schema.type = "string";
      if (max === undefined) {
        schema.maxLength = type === "SHORT_ANSWER" ? 150 : 750;
      }
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
      if (!resolvedOptions?.length)
        return {
          success: false,
          msg: "Options are required for multiple choice / dropdown",
        };
      schema.type = "string";
      if (!allowOther) {
        schema.enum = resolvedOptions;
      }
      break;
    case "CHECKBOXES":
      if (!resolvedOptions?.length)
        return { success: false, msg: "Options required for checkboxes" };
      schema.type = "array";
      if (allowOther) {
        schema.items = { type: "string" };
      } else {
        schema.items = { type: "string", enum: resolvedOptions };
      }
      break;
    case "FILE_UPLOAD":
      schema.type = "string";
      break;
    case "BOOLEAN":
      schema.type = "boolean";
      break;
    case "LINK":
      schema.type = "string";
      schema.format = "uri";
      break;
    default:
      schema.type = "string";
  }

  if (min !== undefined) {
    if (schema.type === "string") schema.minLength = min;
    if (schema.type === "array") schema.minItems = min;
    if (schema.type === "number") schema.minimum = min;
  } else {
    if (schema.type === "array" && !optional) schema.minItems = 1;
  }

  if (max !== undefined) {
    if (schema.type === "string") {
      // Explicit max value overrides any defaults
      schema.maxLength = max;
    }
    if (schema.type === "array") schema.maxItems = max;
    if (schema.type === "number") schema.maximum = max;
  }

  return { success: true, schema };
}

export function generateJsonSchema(form: FORMS.FormType): OptionalSchema {
  const schema: JSONSchema7 = {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  };

  const properties: Record<string, JSONSchema7> = {};
  const required: string[] = [];

  for (const formQuestion of form.questions) {
    const { question, optional, ...rest } = formQuestion;
    const convert = createJsonSchemaValidator({ optional, ...rest });
    if (convert.success) properties[question] = convert.schema;
    else return convert;

    if (!optional) {
      required.push(question);
    }
  }

  schema.properties = properties;
  if (required.length > 0) {
    schema.required = required;
  }

  return { success: true, schema };
}

// Helper to regenerate presigned URLs for media
export async function regenerateMediaUrls(
  instructions: FORMS.FormType["instructions"],
) {
  if (!instructions) return [];
  const updatedQuestions = await Promise.all(
    instructions.map(async (i) => {
      const updated = { ...i };

      // Regenerate image URL if objectName exists
      if ("imageObjectName" in i && i.imageObjectName) {
        try {
          updated.imageUrl = await minioClient.presignedGetObject(
            MINIO.FORM_ASSETS_BUCKET_NAME,
            i.imageObjectName,
            MINIO.PRESIGNED_URL_EXPIRY,
          );
        } catch (e) {
          console.error("Failed to regenerate image URL:", e);
        }
      }

      // Regenerate video URL if objectName exists
      if ("videoObjectName" in i && i.videoObjectName) {
        try {
          updated.videoUrl = await minioClient.presignedGetObject(
            MINIO.FORM_ASSETS_BUCKET_NAME,
            i.videoObjectName,
            MINIO.PRESIGNED_URL_EXPIRY,
          );
        } catch (e) {
          console.error("Failed to regenerate video URL:", e);
        }
      }

      return updated;
    }),
  );

  return updatedQuestions;
}

// All of this will be moved to @forge/utils but its here for now
export const CreateFormSchema = FormSchemaSchema.omit({
  id: true,
  name: true,
  slugName: true,
  createdAt: true,
  formData: true,
  formValidatorJson: true,
})
  .extend({ formData: FORMS.FormSchemaValidator })
  .extend({ section: z.string().optional() });

type CreateFormType = z.infer<typeof CreateFormSchema>;

export async function createForm(input: CreateFormType): Promise<Form> {
  const jsonSchema = generateJsonSchema(input.formData);

  const slug_name = input.formData.name.toLowerCase().replaceAll(" ", "-");

  if (!jsonSchema.success) {
    throw new TRPCError({
      message: jsonSchema.msg,
      code: "BAD_REQUEST",
    });
  }

  let sectionId: string | null = null;
  const sectionName = input.section ?? "General";

  if (sectionName !== "General") {
    const section = await db.query.FormSections.findFirst({
      where: (t, { eq }) => eq(t.name, sectionName),
    });
    sectionId = section?.id ?? null;
  }

  const [form] = await db
    .insert(FormsSchemas)
    .values({
      ...input,
      name: input.formData.name,
      slugName: slug_name,
      formValidatorJson: jsonSchema.schema,
      sectionId,
    })
    .returning();

  if (!form) {
    throw new TRPCError({
      message: "Could not create form",
      code: "INTERNAL_SERVER_ERROR",
    });
  }

  return form;
}
