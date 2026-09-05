import type { z } from "zod";

import { callbackConfigurationSchema } from "@forge/validators";

/**
 * How the callback dialog's three inputs become the input mappings
 * `forms.configureCallback` stores. The procedure accepts `z.unknown()` and
 * validates on the server, so nothing on the client was checking this shape —
 * the annotated return type here is the only thing that does.
 */

type CallbackMapping = z.infer<
  typeof callbackConfigurationSchema
>["mappings"][number];

/** The callback dialog's draft: which callback, and where its input comes from. */
export interface FormCallbackDraft {
  questionId: string;
  slug: string;
  value: string;
}

export interface ConfiguredFormCallback {
  active: boolean;
  callbackSlug: string;
  id: string;
  mappings: unknown;
}

export function savedCallbackDraft(
  callback: ConfiguredFormCallback,
): FormCallbackDraft {
  const parsed = callbackConfigurationSchema.shape.mappings.safeParse(
    callback.mappings,
  );
  const source = parsed.success
    ? parsed.data.find(
        ({ inputKey }) =>
          inputKey ===
          (callback.callbackSlug === "discord.assign-role" ? "roleId" : "note"),
      )?.source
    : undefined;
  return {
    slug: callback.callbackSlug,
    questionId: source?.kind === "question" ? source.questionId : "",
    value:
      source?.kind === "fixed" && typeof source.value === "string"
        ? source.value
        : "",
  };
}

/**
 * Every callback is handed the responding member, because a callback that
 * cannot identify the member has nothing to act on. The second input is what
 * differs: assigning a Discord role needs a role id typed by the author, while
 * a recruiting note can be pulled from a text answer instead — and falls back
 * to the typed value when no question is chosen.
 */
export function callbackInputMappings({
  questionId,
  slug,
  value,
}: FormCallbackDraft): CallbackMapping[] {
  const member: CallbackMapping = {
    inputKey: "memberId",
    source: { kind: "system", value: "member_id" },
  };
  if (slug === "discord.assign-role") {
    return [member, { inputKey: "roleId", source: { kind: "fixed", value } }];
  }
  return [
    member,
    questionId
      ? { inputKey: "note", source: { kind: "question", questionId } }
      : { inputKey: "note", source: { kind: "fixed", value } },
  ];
}
