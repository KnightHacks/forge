import type { AnyProcedure, AnyRouter } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { PERMISSIONS } from "@forge/consts";
import type {
  callbackConfigurationSchema,
  FormQuestion,
} from "@forge/validators";
import { formDefinitionSchema } from "@forge/validators";

import type { PermissionMap } from "../permissions";

export const callbackRespondentValues = [
  "member_id",
  "respondent_name",
  "respondent_email",
  "auth_user_id",
  "discord_user_id",
] as const;

export type CallbackRespondentValue = (typeof callbackRespondentValues)[number];
export type CallbackSourceKind = "fixed" | "question" | "respondent";

export interface FormCallbackInputMetadata {
  allowedSources?: readonly CallbackSourceKind[];
  description?: string;
  fixedInputType?: "email" | "number" | "text";
  label?: string;
  placeholder?: string;
  questionTypes?: readonly FormQuestion["type"][];
  respondentValues?: readonly CallbackRespondentValue[];
}

export interface FormCallbackRegistration<
  TSchema extends z.ZodType = z.ZodType,
> {
  description: string;
  inputSchema: TSchema;
  inputs?: Readonly<Record<string, FormCallbackInputMetadata>>;
  label: string;
  requiredPermission: PERMISSIONS.PermissionKey;
  slug: string;
}

export interface ForgeTRPCMeta {
  formCallback?: FormCallbackRegistration;
}

export interface FormCallbackDefinition<
  TSchema extends z.ZodType = z.ZodType,
> extends FormCallbackRegistration<TSchema> {
  procedurePath: string;
}

export function defineFormCallback<TSchema extends z.ZodType>(
  definition: FormCallbackRegistration<TSchema> & { procedurePath?: string },
): FormCallbackDefinition<TSchema> {
  return {
    ...definition,
    procedurePath: definition.procedurePath ?? definition.slug,
  };
}

export type FormCallbackRegistry = ReadonlyMap<string, FormCallbackDefinition>;

export function createFormCallbackRegistry(
  definitions: readonly FormCallbackDefinition[],
): FormCallbackRegistry {
  const registry = new Map<string, FormCallbackDefinition>();
  for (const definition of definitions) {
    if (registry.has(definition.slug)) {
      throw new Error(`Duplicate form callback metadata: ${definition.slug}`);
    }
    if (!(definition.inputSchema instanceof z.ZodObject)) {
      throw new Error(
        `Form callback ${definition.slug} must accept an object.`,
      );
    }
    const shape = definition.inputSchema.shape as Record<string, z.ZodType>;
    for (const key of Object.keys(definition.inputs ?? {})) {
      if (!(key in shape)) {
        throw new Error(
          `Form callback ${definition.slug} describes unknown input ${key}.`,
        );
      }
    }
    registry.set(definition.slug, definition);
  }
  return registry;
}

export function createFormCallbackRegistryFromRouter(
  router: AnyRouter,
): FormCallbackRegistry {
  const procedures = router._def.procedures as Record<string, AnyProcedure>;
  const definitions = Object.entries(procedures).flatMap(
    ([procedurePath, procedure]) => {
      const registration = (procedure._def.meta as ForgeTRPCMeta | undefined)
        ?.formCallback;
      if (!registration) return [];
      if (procedure._def.type !== "mutation") {
        throw new Error(
          `Form callback ${registration.slug} must be a mutation procedure.`,
        );
      }
      return [{ ...registration, procedurePath }];
    },
  );
  return createFormCallbackRegistry(definitions);
}

export async function getFormCallbackRegistry(): Promise<FormCallbackRegistry> {
  const { formCallbackRouter } = await import("./procedures");
  return createFormCallbackRegistryFromRouter(formCallbackRouter);
}

function defaultInputLabel(inputKey: string) {
  return inputKey
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^./, (first) => first.toUpperCase());
}

export function listFormCallbackCatalog(
  registry: FormCallbackRegistry,
  permissions: PermissionMap,
) {
  return [...registry.values()].map((definition) => {
    const shape = (definition.inputSchema as z.ZodObject).shape as Record<
      string,
      z.ZodType
    >;
    return {
      available:
        permissions.IS_OFFICER === true
          ? true
          : permissions[definition.requiredPermission] === true,
      description: definition.description,
      inputs: Object.keys(shape).map((key) => ({
        allowedSources: definition.inputs?.[key]?.allowedSources ?? [
          "question",
          "respondent",
          "fixed",
        ],
        description: definition.inputs?.[key]?.description,
        fixedInputType: definition.inputs?.[key]?.fixedInputType ?? "text",
        key,
        label: definition.inputs?.[key]?.label ?? defaultInputLabel(key),
        placeholder: definition.inputs?.[key]?.placeholder,
        questionTypes: definition.inputs?.[key]?.questionTypes,
        respondentValues: definition.inputs?.[key]?.respondentValues,
      })),
      label: definition.label,
      requiredPermission: definition.requiredPermission,
      slug: definition.slug,
    };
  });
}

export interface CallbackMapping {
  inputKey: string;
  source:
    | { kind: "fixed"; value: unknown }
    | { kind: "question"; questionId: string }
    | { kind: "respondent"; value: CallbackRespondentValue };
}

function callbackQuestionValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(callbackQuestionValue);
  if (typeof value !== "object" || value === null) return value;
  if (
    "kind" in value &&
    value.kind === "option" &&
    "label" in value &&
    typeof value.label === "string"
  ) {
    return value.label;
  }
  if (
    "kind" in value &&
    value.kind === "other" &&
    "text" in value &&
    typeof value.text === "string"
  ) {
    return value.text;
  }
  return value;
}

export function mapFormCallbackInput(
  mappings: readonly CallbackMapping[],
  source: {
    answers: Record<string, unknown>;
    respondent: Record<CallbackRespondentValue, unknown>;
  },
) {
  const result: Record<string, unknown> = {};
  for (const mapping of mappings) {
    if (mapping.inputKey in result) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Duplicate callback input mapping: ${mapping.inputKey}`,
      });
    }
    if (mapping.source.kind === "fixed") {
      result[mapping.inputKey] = mapping.source.value;
    } else if (mapping.source.kind === "question") {
      if (!(mapping.source.questionId in source.answers)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Missing callback question: ${mapping.source.questionId}`,
        });
      }
      result[mapping.inputKey] = callbackQuestionValue(
        source.answers[mapping.source.questionId],
      );
    } else {
      result[mapping.inputKey] = source.respondent[mapping.source.value];
    }
  }
  return result;
}

function representativeQuestionValue(question: FormQuestion): unknown {
  switch (question.type) {
    case "short_text":
    case "paragraph":
      return "Example";
    case "email":
      return "member@example.com";
    case "phone":
      return "+14075550123";
    case "link":
      return "https://example.com";
    case "multiple_choice":
    case "dropdown":
      return "Example";
    case "checkboxes":
      return ["Example"];
    case "file":
      return {
        attachmentId: "00000000-0000-4000-8000-000000000000",
        fileName: "example.pdf",
      };
    case "linear_scale":
    case "number":
      return 1;
    case "date":
      return "2026-01-01";
    case "time":
      return "12:00";
    case "boolean":
      return true;
  }
}

function representativeRespondentValue(value: CallbackRespondentValue) {
  switch (value) {
    case "member_id":
    case "auth_user_id":
      return "00000000-0000-4000-8000-000000000000";
    case "discord_user_id":
      return "123456789012345678";
    case "respondent_email":
      return "member@example.com";
    case "respondent_name":
      return "Example Member";
  }
}

export function assertCallbackMappingsMatchSchema(input: {
  definition: FormCallbackDefinition;
  formDefinition: unknown;
  mappings: z.infer<typeof callbackConfigurationSchema>["mappings"];
}) {
  if (!(input.definition.inputSchema instanceof z.ZodObject)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Callback inputs must use an object schema.",
    });
  }
  const formDefinition = formDefinitionSchema.parse(input.formDefinition);
  const questions = new Map(
    formDefinition.questions.map((question) => [question.id, question]),
  );
  const shape: Record<string, z.ZodType> = input.definition.inputSchema.shape;
  const seenInputs = new Set<string>();
  const seenQuestions = new Set<string>();

  for (const mapping of input.mappings) {
    if (seenInputs.has(mapping.inputKey)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Duplicate callback input mapping: ${mapping.inputKey}`,
      });
    }
    seenInputs.add(mapping.inputKey);
    const target = shape[mapping.inputKey];
    if (!target) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Unknown callback input: ${mapping.inputKey}`,
      });
    }

    const metadata = input.definition.inputs?.[mapping.inputKey];
    const allowedSources = metadata?.allowedSources ?? [
      "question",
      "respondent",
      "fixed",
    ];
    if (!allowedSources.includes(mapping.source.kind)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${defaultInputLabel(mapping.inputKey)} does not allow ${mapping.source.kind} values.`,
      });
    }

    let representative: unknown;
    if (mapping.source.kind === "fixed") {
      representative = mapping.source.value;
    } else if (mapping.source.kind === "respondent") {
      if (
        metadata?.respondentValues &&
        !metadata.respondentValues.includes(mapping.source.value)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${defaultInputLabel(mapping.inputKey)} does not allow that respondent value.`,
        });
      }
      representative = representativeRespondentValue(mapping.source.value);
    } else {
      if (seenQuestions.has(mapping.source.questionId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Each form question may supply only one callback input.",
        });
      }
      seenQuestions.add(mapping.source.questionId);
      const question = questions.get(mapping.source.questionId);
      if (!question || question.retired) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Callback question is missing or retired: ${mapping.source.questionId}`,
        });
      }
      if (
        metadata?.questionTypes &&
        !metadata.questionTypes.includes(question.type)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${defaultInputLabel(mapping.inputKey)} does not allow ${question.type} questions.`,
        });
      }
      // Explicit question metadata is the registration's compatibility
      // contract. The submitted answer is still parsed by the callback schema.
      if (metadata?.questionTypes) continue;
      representative = representativeQuestionValue(question);
    }

    if (!target.safeParse(representative).success) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Callback source is incompatible with ${mapping.inputKey}.`,
      });
    }
  }

  const missing = Object.entries(shape)
    .filter(
      ([key, schema]) =>
        !seenInputs.has(key) && !schema.safeParse(undefined).success,
    )
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Missing callback input mappings: ${missing.join(", ")}`,
    });
  }
}

export function assertCallbackConfigurationAllowed<TSchema extends z.ZodType>(
  definition: FormCallbackDefinition<TSchema>,
  input: { input: unknown; permissions: PermissionMap },
): asserts input is { input: z.infer<TSchema>; permissions: PermissionMap } {
  if (
    !input.permissions.IS_OFFICER &&
    !input.permissions[definition.requiredPermission]
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${definition.requiredPermission} is required to configure this callback.`,
    });
  }
  const parsed = definition.inputSchema.safeParse(input.input);
  if (!parsed.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Callback input is invalid or outside the approved allowlist.",
    });
  }
}

interface CallbackExecution {
  id: string;
  input: unknown;
  slug: string;
}

interface CallbackDispatcherState {
  claim(id: string): Promise<CallbackExecution | null>;
  fail(id: string, message: string): Promise<unknown>;
  succeed(id: string): Promise<unknown>;
}

export function createFormCallbackDispatcher({
  handlers,
  registry,
  state,
}: {
  handlers: Record<string, (input: unknown) => Promise<unknown>>;
  registry: FormCallbackRegistry;
  state: CallbackDispatcherState;
}) {
  const dispatch = async (executionId: string) => {
    const execution = await state.claim(executionId);
    if (!execution) return { status: "succeeded" as const };

    const definition = registry.get(execution.slug);
    const handler = handlers[execution.slug];
    if (!definition || !handler) {
      const error = `No registered callback handler for ${execution.slug}.`;
      await state.fail(execution.id, error);
      return { error, status: "failed" as const };
    }

    const parsed = definition.inputSchema.safeParse(execution.input);
    if (!parsed.success) {
      const error = "Stored callback input failed validation.";
      await state.fail(execution.id, error);
      return { error, status: "failed" as const };
    }

    try {
      await handler(parsed.data);
      await state.succeed(execution.id);
      return { status: "succeeded" as const };
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : "Callback failed.";
      await state.fail(execution.id, error);
      return { error, status: "failed" as const };
    }
  };

  return { dispatch, retry: dispatch };
}
