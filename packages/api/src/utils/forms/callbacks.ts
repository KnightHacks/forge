import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { PERMISSIONS } from "@forge/consts";
import type {
  callbackConfigurationSchema,
  FormQuestion,
} from "@forge/validators";
import { formDefinitionSchema } from "@forge/validators";

import type { PermissionMap } from "../permissions";

export interface FormCallbackDefinition<TSchema extends z.ZodType = z.ZodType> {
  description: string;
  inputSchema: TSchema;
  label: string;
  requiredPermission: PERMISSIONS.PermissionKey;
  slug: string;
}

export function defineFormCallback<TSchema extends z.ZodType>(
  definition: FormCallbackDefinition<TSchema>,
) {
  return definition;
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
    registry.set(definition.slug, definition);
  }
  return registry;
}

export function listFormCallbackCatalog(
  registry: FormCallbackRegistry,
  permissions: PermissionMap,
) {
  return [...registry.values()].map((definition) => ({
    available:
      permissions.IS_OFFICER === true
        ? true
        : permissions[definition.requiredPermission] === true,
    description: definition.description,
    label: definition.label,
    requiredPermission: definition.requiredPermission,
    slug: definition.slug,
  }));
}

type CallbackSystemValue =
  | "event_id"
  | "member_id"
  | "response_id"
  | "submitted_at"
  | "user_id";

export interface CallbackMapping {
  inputKey: string;
  source:
    | { kind: "fixed"; value: unknown }
    | { kind: "question"; questionId: string }
    | { kind: "system"; value: CallbackSystemValue };
}

export function mapFormCallbackInput(
  mappings: readonly CallbackMapping[],
  source: {
    answers: Record<string, unknown>;
    system: Record<CallbackSystemValue, unknown>;
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
      result[mapping.inputKey] = source.answers[mapping.source.questionId];
    } else {
      result[mapping.inputKey] = source.system[mapping.source.value];
    }
  }
  return result;
}

function representativeQuestionValue(question: FormQuestion): unknown {
  switch (question.type) {
    case "short_text":
    case "paragraph":
    case "email":
    case "phone":
    case "link":
      return "00000000-0000-4000-8000-000000000000";
    case "multiple_choice":
    case "dropdown":
      return { kind: "option", label: "Example", value: "example" };
    case "checkboxes":
      return [{ kind: "option", label: "Example", value: "example" }];
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

function representativeSystemValue(
  value: "event_id" | "member_id" | "response_id" | "submitted_at" | "user_id",
) {
  return value === "submitted_at"
    ? "2026-01-01T00:00:00.000Z"
    : "00000000-0000-4000-8000-000000000000";
}

export function assertCallbackMappingsMatchSchema(input: {
  callbackSchema: z.ZodType;
  formDefinition: unknown;
  mappings: z.infer<typeof callbackConfigurationSchema>["mappings"];
}) {
  if (!(input.callbackSchema instanceof z.ZodObject)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Callback inputs must use an object schema.",
    });
  }
  const formDefinition = formDefinitionSchema.parse(input.formDefinition);
  const questions = new Map(
    formDefinition.questions.map((question) => [question.id, question]),
  );
  const shape: Record<string, z.ZodType> = input.callbackSchema.shape;
  const seen = new Set<string>();

  for (const mapping of input.mappings) {
    if (seen.has(mapping.inputKey)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Duplicate callback input mapping: ${mapping.inputKey}`,
      });
    }
    seen.add(mapping.inputKey);
    const target = shape[mapping.inputKey];
    if (!target) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Unknown callback input: ${mapping.inputKey}`,
      });
    }

    let representative: unknown;
    if (mapping.source.kind === "fixed") {
      representative = mapping.source.value;
    } else if (mapping.source.kind === "system") {
      if (mapping.source.value === "event_id") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "General forms do not provide an event ID callback value.",
        });
      }
      representative = representativeSystemValue(mapping.source.value);
    } else {
      const question = questions.get(mapping.source.questionId);
      if (!question || question.retired) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Callback question is missing or retired: ${mapping.source.questionId}`,
        });
      }
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
      ([key, schema]) => !seen.has(key) && !schema.safeParse(undefined).success,
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
