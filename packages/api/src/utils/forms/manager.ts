import { randomUUID } from "node:crypto";
import type { JSONSchema7 } from "json-schema";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Session } from "@forge/auth/server";
import type { FORMS } from "@forge/consts";
import { and, eq, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions } from "@forge/db/schemas/auth";
import {
  DuesPayment,
  FormResponse,
  FormResponseRoles,
  FormSections,
  FormSingleResponseClaim,
  FormsSchemas,
  Member,
  TrpcFormConnection,
} from "@forge/db/schemas/knight-hacks";
import { formDefinitionSchema, validateFormAnswers } from "@forge/validators";

import type { WriteDb } from "../db";
import { buildDuesStatus } from "../dues/status";
import { assertAndAttachResponseFiles } from "./attachments";

export interface FormConnectionMapping {
  customValue?: unknown;
  formField?: string;
  procField: string;
}

// Code-owned forms let a feature ship before the admin form builder exists.
// The shape still mirrors FormsSchemas/TrpcFormConnection so it can move to DB
// configuration later without changing response submission behavior.
export interface CodeOwnedFormConfig {
  allowEdit: boolean;
  allowResubmission: boolean;
  completionRedirectUrl?: string;
  connection?: {
    connections: readonly FormConnectionMapping[];
    id: string;
    proc: string;
  };
  duesOnly: boolean;
  formData: FORMS.FormType;
  formValidatorJson: JSONSchema7 | Record<string, unknown>;
  id: string;
  isClosed: boolean;
  name: string;
  section: string;
  sectionId: string;
  slugName: string;
}

function withFormMetadata(
  form: typeof FormsSchemas.$inferSelect,
  codeOwnedForm?: CodeOwnedFormConfig,
) {
  return {
    ...form,
    completionRedirectUrl: codeOwnedForm?.completionRedirectUrl ?? null,
  };
}

export type FormResponseCallback = (input: {
  data: Record<string, unknown>;
  database: WriteDb;
  session: Session;
}) => Promise<unknown>;

export type FormResponseCallbackMap = Record<string, FormResponseCallback>;

// Generic form response input. Domain-specific callbacks validate their mapped
// data separately after the forms manager has validated the form response.
export const createResponseInputSchema = z.object({
  form: z.string().uuid(),
  responseData: z.record(z.string(), z.unknown()),
});

export const updateResponseInputSchema = createResponseInputSchema.extend({
  upsert: z.boolean().default(false),
});

interface ResponseOwnerSession {
  user: Pick<Session["user"], "id">;
}

const formConnectionMappingSchema = z.object({
  customValue: z.unknown().optional(),
  formField: z.string().optional(),
  procField: z.string(),
});

function getCodeOwnedFormById(
  codeOwnedForms: readonly CodeOwnedFormConfig[],
  formId: string,
) {
  return codeOwnedForms.find((form) => form.id === formId);
}

function getCodeOwnedFormBySlug(
  codeOwnedForms: readonly CodeOwnedFormConfig[],
  slugName: string,
) {
  return codeOwnedForms.find((form) => form.slugName === slugName);
}

async function ensureCodeOwnedForm(
  database: WriteDb,
  form: CodeOwnedFormConfig,
) {
  await database
    .insert(FormSections)
    .values({ id: form.sectionId, name: form.section })
    .onConflictDoUpdate({
      target: FormSections.name,
      set: { name: form.section },
    });

  await database
    .insert(FormsSchemas)
    .values({
      id: form.id,
      name: form.name,
      slugName: form.slugName,
      duesOnly: form.duesOnly,
      allowResubmission: form.allowResubmission,
      allowEdit: form.allowEdit,
      formData: form.formData,
      formValidatorJson: form.formValidatorJson,
      kind: "system",
      manuallyClosed: form.isClosed,
      responseMode: form.allowResubmission
        ? "multiple_locked"
        : form.allowEdit
          ? "single_editable"
          : "single_locked",
      section: form.section,
      sectionId: form.sectionId,
      state: "published",
      isClosed: form.isClosed,
    })
    .onConflictDoUpdate({
      target: FormsSchemas.id,
      set: {
        name: form.name,
        slugName: form.slugName,
        duesOnly: form.duesOnly,
        allowResubmission: form.allowResubmission,
        allowEdit: form.allowEdit,
        formData: form.formData,
        formValidatorJson: form.formValidatorJson,
        kind: "system",
        manuallyClosed: form.isClosed,
        responseMode: form.allowResubmission
          ? "multiple_locked"
          : form.allowEdit
            ? "single_editable"
            : "single_locked",
        section: form.section,
        sectionId: form.sectionId,
        state: "published",
        isClosed: form.isClosed,
      },
    });

  if (!form.connection) return;

  await database
    .insert(TrpcFormConnection)
    .values({
      id: form.connection.id,
      form: form.id,
      proc: form.connection.proc,
      connections: form.connection.connections,
    })
    .onConflictDoUpdate({
      target: TrpcFormConnection.id,
      set: {
        form: form.id,
        proc: form.connection.proc,
        connections: form.connection.connections,
      },
    });
}

async function getFormForResponse(
  database: WriteDb,
  formId: string,
  codeOwnedForms: readonly CodeOwnedFormConfig[],
) {
  const codeOwnedForm = getCodeOwnedFormById(codeOwnedForms, formId);

  if (codeOwnedForm) {
    await ensureCodeOwnedForm(database, codeOwnedForm);

    const preparedForm = await database.query.FormsSchemas.findFirst({
      where: eq(FormsSchemas.id, formId),
    });

    if (!preparedForm) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Form could not be prepared for response.",
      });
    }

    return withFormMetadata(preparedForm, codeOwnedForm);
  }

  const existingForm = await database.query.FormsSchemas.findFirst({
    where: eq(FormsSchemas.id, formId),
  });

  if (existingForm) return withFormMetadata(existingForm);

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Form doesn't exist for response.",
  });
}

async function assertCanRespondToForm(
  database: WriteDb,
  formId: string,
  userId: string,
) {
  const responseRoles = await database
    .select({ roleId: FormResponseRoles.roleId })
    .from(FormResponseRoles)
    .where(eq(FormResponseRoles.formId, formId));

  if (responseRoles.length === 0) return;

  const userRoleIds = await database
    .select({ roleId: Permissions.roleId })
    .from(Permissions)
    .where(sql`cast(${Permissions.userId} as text) = ${userId}`);

  const userRoleIdSet = new Set(userRoleIds.map((role) => role.roleId));
  const hasRequiredRole = responseRoles.some((role) =>
    userRoleIdSet.has(role.roleId),
  );

  if (!hasRequiredRole) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to respond to this form.",
    });
  }
}

async function assertDuesEligibility(
  database: WriteDb,
  form: { duesOnly: boolean },
  userId: string,
) {
  if (!form.duesOnly) return;
  const member = await database.query.Member.findFirst({
    columns: { id: true },
    where: eq(Member.userId, userId),
  });
  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Paid dues are required.",
    });
  }
  const duesRows = await database
    .select()
    .from(DuesPayment)
    .where(eq(DuesPayment.memberId, member.id));
  if (!buildDuesStatus({ duesRows }).paid) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Paid dues are required.",
    });
  }
}

async function assertGeneralFormMember(
  database: WriteDb,
  form: { kind: string },
  userId: string,
) {
  if (form.kind !== "general") return;
  const member = await database.query.Member.findFirst({
    columns: { id: true },
    where: eq(Member.userId, userId),
  });
  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Create a member profile before responding to this form.",
    });
  }
}

async function assertCanCreateAnotherResponse(
  database: WriteDb,
  formId: string,
  userId: string,
) {
  const existingResponse = await database.query.FormResponse.findFirst({
    where: and(eq(FormResponse.form, formId), eq(FormResponse.userId, userId)),
    columns: { id: true },
  });

  if (existingResponse) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You have already submitted a response to this form.",
    });
  }
}

function createZodSchemaFromJsonSchema(jsonSchema: unknown): z.ZodType {
  if (!jsonSchema || typeof jsonSchema !== "object") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Stored form validation is invalid.",
    });
  }
  const schema = jsonSchema as JSONSchema7;
  if (Array.isArray(schema.enum)) {
    const values = schema.enum;
    return z
      .unknown()
      .refine(
        (value) => values.some((candidate) => candidate === value),
        "Choose an approved value.",
      );
  }

  if (schema.type === "object") {
    const required = new Set(schema.required ?? []);
    const shape: Record<string, z.ZodType> = {};
    for (const [key, property] of Object.entries(schema.properties ?? {})) {
      if (typeof property === "boolean") {
        if (!property) continue;
        shape[key] = required.has(key) ? z.unknown() : z.unknown().optional();
        continue;
      }
      const child = createZodSchemaFromJsonSchema(property);
      shape[key] = required.has(key) ? child : child.optional();
    }
    const object = z.object(shape);
    return schema.additionalProperties === false ? object.strict() : object;
  }

  if (schema.type === "array") {
    const itemSchema =
      schema.items && !Array.isArray(schema.items)
        ? typeof schema.items === "boolean"
          ? z.unknown()
          : createZodSchemaFromJsonSchema(schema.items)
        : z.unknown();
    let array = z.array(itemSchema);
    if (schema.minItems !== undefined) array = array.min(schema.minItems);
    if (schema.maxItems !== undefined) array = array.max(schema.maxItems);
    return array;
  }

  if (schema.type === "number" || schema.type === "integer") {
    let number = z.number();
    if (schema.type === "integer") number = number.int();
    if (schema.minimum !== undefined) number = number.min(schema.minimum);
    if (schema.maximum !== undefined) number = number.max(schema.maximum);
    return number;
  }
  if (schema.type === "boolean") return z.boolean();
  if (schema.type === "null") return z.null();

  if (schema.type === "string" || schema.type === undefined) {
    let string = z.string();
    if (schema.minLength !== undefined) string = string.min(schema.minLength);
    if (schema.maxLength !== undefined) string = string.max(schema.maxLength);
    if (schema.format === "email") {
      string = string.refine(
        (value) => z.email().safeParse(value).success,
        "Enter a valid email address.",
      );
    }
    if (schema.format === "uri") {
      string = string.refine(
        (value) => z.url().safeParse(value).success,
        "Enter a valid URL.",
      );
    }
    if (schema.format === "date") {
      string = string.refine(
        (value) => z.iso.date().safeParse(value).success,
        "Enter a valid date.",
      );
    }
    if (schema.pattern) {
      const approvedPattern =
        schema.pattern === "^\\+?\\d{7,15}$"
          ? /^\+?\d{7,15}$/
          : schema.pattern === "^([01]\\d|2[0-3]):([0-5]\\d)$"
            ? /^([01]\d|2[0-3]):([0-5]\d)$/
            : null;
      if (!approvedPattern) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Stored form validation uses an unsupported pattern.",
        });
      }
      string = string.regex(approvedPattern);
    }
    return string;
  }

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Stored form validation uses an unsupported type.",
  });
}

function validateResponseData(
  formValidatorJson: unknown,
  responseData: Record<string, unknown>,
  formData?: unknown,
) {
  const definition = formDefinitionSchema.safeParse(formData);
  if (definition.success) {
    return validateFormAnswers(
      definition.data,
      Object.entries(responseData).map(([questionId, value]) => ({
        questionId,
        value,
      })),
    );
  }
  const zodSchema = createZodSchemaFromJsonSchema(formValidatorJson);
  const parsedResponse = zodSchema.safeParse(responseData);

  if (parsedResponse.success) {
    return parsedResponse.data as Record<string, unknown>;
  }

  const errorMessage = parsedResponse.error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: errorMessage
      ? `Form response failed validation: ${errorMessage}`
      : "Form response failed validation.",
  });
}

function mapResponseDataToCallbackInput(
  mappings: readonly FormConnectionMapping[],
  responseData: Record<string, unknown>,
) {
  const callbackData: Record<string, unknown> = {};
  const availableFields = Object.keys(responseData);
  const missingFields: string[] = [];

  for (const mapping of mappings) {
    if (mapping.customValue !== undefined) {
      callbackData[mapping.procField] = mapping.customValue;
      continue;
    }

    if (!mapping.formField) continue;

    const trimmedFormField = mapping.formField.trim();
    if (trimmedFormField in responseData) {
      callbackData[mapping.procField] = responseData[trimmedFormField];
      continue;
    }

    const matchedField = availableFields.find(
      (field) => field.trim().toLowerCase() === trimmedFormField.toLowerCase(),
    );

    if (matchedField) {
      callbackData[mapping.procField] = responseData[matchedField];
      continue;
    }

    missingFields.push(
      `${mapping.procField} (expected form field: "${mapping.formField}")`,
    );
  }

  if (missingFields.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Form response is missing callback fields: ${missingFields.join(
        "; ",
      )}.`,
    });
  }

  return callbackData;
}

async function runFormResponseCallbacks({
  callbacks,
  database,
  formId,
  responseData,
  session,
}: {
  callbacks: FormResponseCallbackMap;
  database: WriteDb;
  formId: string;
  responseData: Record<string, unknown>;
  session: Session;
}) {
  const connections = await database.query.TrpcFormConnection.findMany({
    where: eq(TrpcFormConnection.form, formId),
  });

  const results: unknown[] = [];

  for (const connection of connections) {
    const callback = callbacks[connection.proc];

    if (!callback) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `No server callback is registered for ${connection.proc}.`,
      });
    }

    const mappings = z
      .array(formConnectionMappingSchema)
      .parse(connection.connections);
    const data = mapResponseDataToCallbackInput(mappings, responseData);

    results.push(await callback({ data, database, session }));
  }

  return results;
}

export async function getFormBySlug({
  codeOwnedForms,
  slugName,
}: {
  codeOwnedForms: readonly CodeOwnedFormConfig[];
  slugName: string;
}) {
  const decodedSlugName = decodeURIComponent(slugName);
  const codeOwnedForm = getCodeOwnedFormBySlug(codeOwnedForms, decodedSlugName);

  if (codeOwnedForm) {
    await ensureCodeOwnedForm(db, codeOwnedForm);

    const preparedForm = await db.query.FormsSchemas.findFirst({
      where: eq(FormsSchemas.slugName, decodedSlugName),
    });

    if (!preparedForm) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Form could not be prepared.",
      });
    }

    return withFormMetadata(preparedForm, codeOwnedForm);
  }

  const existingForm = await db.query.FormsSchemas.findFirst({
    where: eq(FormsSchemas.slugName, decodedSlugName),
  });

  if (existingForm) return withFormMetadata(existingForm);

  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Form not found.",
  });
}

export async function createResponse({
  callbacks,
  codeOwnedForms,
  input,
  session,
}: {
  callbacks: FormResponseCallbackMap;
  codeOwnedForms: readonly CodeOwnedFormConfig[];
  input: z.infer<typeof createResponseInputSchema>;
  session: Session;
}) {
  return await db.transaction(async (tx) => {
    // Response persistence and callbacks share this transaction. If any
    // callback throws, the response row rolls back with the callback writes.
    const form = await getFormForResponse(tx, input.form, codeOwnedForms);

    if (form.isClosed) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This form is closed and no longer accepting responses.",
      });
    }
    if (form.kind === "event_feedback") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Use the event feedback flow for this form.",
      });
    }
    if (form.state !== "published") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This form is not published.",
      });
    }
    const now = new Date();
    if (
      form.manuallyClosed === true ||
      (form.opensAt instanceof Date && now < form.opensAt) ||
      (form.closesAt instanceof Date && now >= form.closesAt)
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This form is outside its response window.",
      });
    }

    await assertCanRespondToForm(tx, form.id, session.user.id);
    await assertGeneralFormMember(tx, form, session.user.id);
    await assertDuesEligibility(tx, form, session.user.id);

    if (form.responseMode !== "multiple_locked") {
      await assertCanCreateAnotherResponse(tx, form.id, session.user.id);
    }

    const responseData = validateResponseData(
      form.formValidatorJson,
      input.responseData,
      form.formData,
    );

    const responseId = randomUUID();
    const submittedAt = new Date();
    const [response] = await tx
      .insert(FormResponse)
      .values({
        id: responseId,
        form: form.id,
        formRevision: form.revision,
        responseSnapshot: form.formData,
        userId: session.user.id,
        responseData,
        createdAt: submittedAt,
        editedAt: submittedAt,
      })
      .returning({ id: FormResponse.id });

    if (!response) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Form response could not be saved.",
      });
    }

    if (form.responseMode !== "multiple_locked") {
      await tx.insert(FormSingleResponseClaim).values({
        formId: form.id,
        responseId: response.id,
        userId: session.user.id,
      });
    }

    await assertAndAttachResponseFiles({
      answers: responseData,
      database: tx,
      definition: form.formData,
      formId: form.id,
      responseId: response.id,
      userId: session.user.id,
    });

    if (form.kind === "general") {
      await (
        await import("./database-callbacks")
      ).enqueueConfiguredFormCallbacks({
        answers: responseData,
        database: tx,
        formId: form.id,
        responseId: response.id,
        submittedAt,
        userId: session.user.id,
      });
    }

    // The legacy synchronous connection path remains only for code-owned
    // system forms (currently member signup). Republished general forms use
    // the durable registered callback platform and must never replay obsolete
    // legacy tRPC connections.
    const callbackResults =
      form.kind === "system"
        ? await runFormResponseCallbacks({
            callbacks,
            database: tx,
            formId: form.id,
            responseData,
            session,
          })
        : [];

    return {
      ...(form.kind === "general" ? {} : { callbackResults }),
      formResponseId: response.id,
    };
  });
}

async function updateResponseWithDatabase({
  codeOwnedForms,
  database,
  enforceAllowEdit = true,
  input,
  session,
}: {
  codeOwnedForms: readonly CodeOwnedFormConfig[];
  database: WriteDb;
  enforceAllowEdit?: boolean;
  input: z.infer<typeof updateResponseInputSchema>;
  session: ResponseOwnerSession;
}) {
  const form = await getFormForResponse(database, input.form, codeOwnedForms);
  const bypassLifecycle = !enforceAllowEdit && form.kind === "system";

  if (form.isClosed && !bypassLifecycle) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This form is closed and cannot be edited.",
    });
  }
  const now = new Date();
  if (
    !bypassLifecycle &&
    (form.kind === "event_feedback" ||
      form.state !== "published" ||
      form.manuallyClosed === true ||
      (form.opensAt && now < form.opensAt) ||
      (form.closesAt && now >= form.closesAt))
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "This form response cannot be edited outside its response window.",
    });
  }

  if (enforceAllowEdit && !form.allowEdit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This form response cannot be edited.",
    });
  }
  if (enforceAllowEdit && form.responseMode !== "single_editable") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This form response cannot be edited.",
    });
  }

  await assertCanRespondToForm(database, form.id, session.user.id);
  await assertGeneralFormMember(database, form, session.user.id);
  await assertDuesEligibility(database, form, session.user.id);
  const existingResponse = await database.query.FormResponse.findFirst({
    where: and(
      eq(FormResponse.form, form.id),
      eq(FormResponse.userId, session.user.id),
    ),
    columns: { id: true, responseData: true },
  });

  if (!existingResponse && !input.upsert) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Form response does not exist.",
    });
  }

  if (existingResponse) {
    const definition = formDefinitionSchema.safeParse(form.formData);
    const responseData = definition.success
      ? validateFormAnswers(
          definition.data,
          Object.entries(input.responseData).map(([questionId, value]) => ({
            questionId,
            value,
          })),
          {
            preservedAnswers: existingResponse.responseData as Record<
              string,
              unknown
            >,
          },
        )
      : validateResponseData(
          form.formValidatorJson,
          input.responseData,
          form.formData,
        );
    const [response] = await database
      .update(FormResponse)
      .set({
        editedAt: new Date(),
        responseData,
      })
      .where(eq(FormResponse.id, existingResponse.id))
      .returning({ id: FormResponse.id });

    if (!response) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Form response could not be updated.",
      });
    }

    await assertAndAttachResponseFiles({
      answers: responseData,
      database,
      definition: form.formData,
      formId: form.id,
      responseId: response.id,
      userId: session.user.id,
    });

    return {
      formResponseId: response.id,
      responseData,
    };
  }

  const responseData = validateResponseData(
    form.formValidatorJson,
    input.responseData,
    form.formData,
  );

  const [response] = await database
    .insert(FormResponse)
    .values({
      form: form.id,
      responseData,
      userId: session.user.id,
    })
    .returning({ id: FormResponse.id });

  if (!response) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Form response could not be backfilled.",
    });
  }

  return {
    formResponseId: response.id,
    responseData,
  };
}

export async function updateResponse({
  codeOwnedForms,
  database,
  enforceAllowEdit = true,
  input,
  session,
}: {
  codeOwnedForms: readonly CodeOwnedFormConfig[];
  database?: WriteDb;
  enforceAllowEdit?: boolean;
  input: z.infer<typeof updateResponseInputSchema>;
  session: ResponseOwnerSession;
}) {
  if (database) {
    return updateResponseWithDatabase({
      codeOwnedForms,
      database,
      enforceAllowEdit,
      input,
      session,
    });
  }
  return db.transaction((tx) =>
    updateResponseWithDatabase({
      codeOwnedForms,
      database: tx,
      enforceAllowEdit,
      input,
      session,
    }),
  );
}
