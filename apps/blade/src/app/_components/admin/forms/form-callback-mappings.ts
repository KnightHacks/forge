import type { z } from "zod";

import { callbackConfigurationSchema } from "@forge/validators";

import type {
  CallbackCatalogInput,
  CallbackCatalogItem,
} from "./form-builder-types";

type CallbackMapping = z.infer<
  typeof callbackConfigurationSchema
>["mappings"][number];
type RespondentValue = Extract<
  CallbackMapping["source"],
  { kind: "respondent" }
>["value"];

export type FormCallbackDraftSource =
  | { kind: "fixed"; value: string }
  | { kind: "question"; questionId: string }
  | { kind: "respondent"; value: RespondentValue };

export interface FormCallbackDraft {
  mappings: Record<string, FormCallbackDraftSource>;
  slug: string;
}

export interface ConfiguredFormCallback {
  active: boolean;
  callbackSlug: string;
  id: string;
  mappings: unknown;
}

export const respondentValueLabels = {
  auth_user_id: "Auth User ID",
  discord_user_id: "Discord User ID",
  member_id: "Member ID",
  respondent_email: "Respondent email",
  respondent_name: "Respondent name",
} as const satisfies Record<RespondentValue, string>;

function defaultSource(input: CallbackCatalogInput): FormCallbackDraftSource {
  const respondentValue = input.respondentValues?.[0];
  if (
    respondentValue &&
    input.allowedSources.includes("respondent") &&
    input.respondentValues?.length === 1
  ) {
    return { kind: "respondent", value: respondentValue };
  }
  if (input.allowedSources.includes("question")) {
    return { kind: "question", questionId: "" };
  }
  if (input.allowedSources.includes("fixed")) {
    return { kind: "fixed", value: "" };
  }
  const fallback = input.respondentValues?.[0] ?? "member_id";
  return { kind: "respondent", value: fallback };
}

function fixedDraftValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

export function emptyCallbackDraft(
  callback?: CallbackCatalogItem,
): FormCallbackDraft {
  return {
    mappings: Object.fromEntries(
      (callback?.inputs ?? []).map((input) => [
        input.key,
        defaultSource(input),
      ]),
    ),
    slug: callback?.slug ?? "",
  };
}

export function savedCallbackDraft(
  callback: ConfiguredFormCallback,
  catalog?: CallbackCatalogItem,
): FormCallbackDraft {
  const draft = emptyCallbackDraft(catalog);
  const parsed = callbackConfigurationSchema.shape.mappings.safeParse(
    callback.mappings,
  );
  if (!parsed.success) return { ...draft, slug: callback.callbackSlug };
  return {
    mappings: {
      ...draft.mappings,
      ...Object.fromEntries(
        parsed.data.map(({ inputKey, source }) => [
          inputKey,
          source.kind === "fixed"
            ? { kind: "fixed", value: fixedDraftValue(source.value) }
            : source,
        ]),
      ),
    },
    slug: callback.callbackSlug,
  };
}

export function callbackInputMappings(
  draft: FormCallbackDraft,
): CallbackMapping[] {
  return Object.entries(draft.mappings).map(([inputKey, source]) => ({
    inputKey,
    source,
  }));
}

export function isCallbackDraftComplete(draft: FormCallbackDraft) {
  return Object.values(draft.mappings).every((source) => {
    if (source.kind === "question") return source.questionId.length > 0;
    if (source.kind === "fixed") return source.value.trim().length > 0;
    return true;
  });
}

export function callbackSourceSummary(
  source: FormCallbackDraftSource | undefined,
  questionPrompt?: string,
) {
  if (!source) return "Not configured";
  if (source.kind === "question") {
    return source.questionId
      ? `Question: ${questionPrompt ?? "Unavailable question"}`
      : "Question not selected";
  }
  if (source.kind === "respondent") {
    return respondentValueLabels[source.value];
  }
  return source.value ? `Manual: ${source.value}` : "Manual value not set";
}
