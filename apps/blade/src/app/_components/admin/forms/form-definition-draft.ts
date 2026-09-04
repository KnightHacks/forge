import type { FormDefinition, FormQuestion } from "@forge/validators";

/**
 * The translation between a saved `FormDefinition` and the flat fields the
 * builder edits. Instructions are the awkward part: the stored shape is an
 * ordered list of text, image, and video blocks, while the builder edits one
 * textarea plus a list of uploads.
 */

export type MediaInstruction = Extract<
  FormDefinition["instructions"][number],
  { type: "image" | "video" }
>;

/**
 * The id to write the builder's text block back under. Reusing the saved
 * instruction's id keeps the block in place across saves; a form with no text
 * instruction yet gets a fresh id, minted once so that editing the textarea
 * does not churn the definition.
 */
export function draftTextInstructionId(
  instructions: FormDefinition["instructions"],
) {
  return (
    instructions.find((instruction) => instruction.type === "text")?.id ??
    crypto.randomUUID()
  );
}

/**
 * Every stored text block as one textarea value. Legacy definitions can hold
 * several, so they are joined with a blank line rather than the first one
 * winning and the rest being silently dropped on the next save.
 */
export function draftInstructionsBody(
  instructions: FormDefinition["instructions"],
) {
  return instructions
    .filter(
      (item): item is Extract<typeof item, { type: "text" }> =>
        item.type === "text",
    )
    .map((item) => item.body)
    .join("\n\n");
}

/** The uploaded instruction blocks, which the builder edits as a list. */
export function draftMediaInstructions(
  instructions: FormDefinition["instructions"],
) {
  return instructions.filter(
    (item): item is MediaInstruction =>
      item.type === "image" || item.type === "video",
  );
}

/**
 * The definition the save mutation sends. A blank textarea contributes no text
 * block at all, and an untitled form still gets a title, because the schema
 * requires a non-empty one and rejecting the save at that point would be a
 * validation error the user cannot see the cause of.
 */
export function buildFormDefinition({
  banner,
  description,
  instructions,
  media,
  name,
  questions,
  textId,
}: {
  banner?: FormDefinition["banner"];
  description: string;
  instructions: string;
  media: MediaInstruction[];
  name: string;
  questions: FormQuestion[];
  textId: string;
}): FormDefinition {
  return {
    ...(banner && { banner }),
    description,
    instructions: [
      ...(instructions.trim()
        ? [
            {
              body: instructions,
              id: textId,
              type: "text" as const,
            },
          ]
        : []),
      ...media,
    ],
    questions,
    title: name || "Untitled form",
  };
}
