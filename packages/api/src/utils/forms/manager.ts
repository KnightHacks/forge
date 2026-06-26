import type { JSONSchema7 } from "json-schema";
import { TRPCError } from "@trpc/server";
import jsonSchemaToZod from "json-schema-to-zod";
import { z } from "zod";

import type { Session } from "@forge/auth/server";
import type { FORMS } from "@forge/consts";
import { and, eq, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions } from "@forge/db/schemas/auth";
import {
  FormResponse,
  FormResponseRoles,
  FormsSchemas,
  TrpcFormConnection,
} from "@forge/db/schemas/knight-hacks";

import type { WriteDb } from "../db";

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
      section: form.section,
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
        section: form.section,
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

function createZodSchemaFromJsonSchema(jsonSchema: unknown) {
  const zodSchemaString = jsonSchemaToZod(jsonSchema as JSONSchema7);

  // The JSON schema is generated by Forge or code-owned feature config.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
  return new Function("z", `return ${zodSchemaString}`)(z) as z.ZodSchema;
}

function validateResponseData(
  formValidatorJson: unknown,
  responseData: Record<string, unknown>,
) {
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

    await assertCanRespondToForm(tx, form.id, session.user.id);

    if (!form.allowResubmission) {
      await assertCanCreateAnotherResponse(tx, form.id, session.user.id);
    }

    const responseData = validateResponseData(
      form.formValidatorJson,
      input.responseData,
    );

    const [response] = await tx
      .insert(FormResponse)
      .values({
        form: form.id,
        userId: session.user.id,
        responseData,
      })
      .returning({ id: FormResponse.id });

    if (!response) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Form response could not be saved.",
      });
    }

    const callbackResults = await runFormResponseCallbacks({
      callbacks,
      database: tx,
      formId: form.id,
      responseData,
      session,
    });

    return {
      callbackResults,
      formResponseId: response.id,
    };
  });
}
