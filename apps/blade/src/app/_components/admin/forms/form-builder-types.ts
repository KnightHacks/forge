import type { FormDefinition } from "@forge/validators";

import type { FormAvailabilitySource } from "./form-availability-draft";

/** The saved form the builder is editing. Absent while creating a new one. */
export interface BuilderInitial extends FormAvailabilitySource {
  definition: FormDefinition;
  id: string;
  name: string;
  revision: number;
  slugName: string;
  state: "archived" | "draft" | "published";
}

/**
 * Which of the builder's own dialogs is open. Settings, callbacks, and delete
 * were three booleans, but each is opened from a header button the previous one
 * covers, so two could never be true at once — they were one value all along.
 * Sharing is not in here: it lives in the query string so the dialog survives a
 * refresh and can be linked to.
 */
export type BuilderDialog = "actions" | "callbacks" | "none" | "settings";

export interface CallbackCatalogInput {
  allowedSources: readonly ("fixed" | "question" | "respondent")[];
  description?: string;
  fixedInputType: "email" | "number" | "text";
  key: string;
  label: string;
  placeholder?: string;
  questionTypes?: readonly FormDefinition["questions"][number]["type"][];
  respondentValues?: readonly (
    | "auth_user_id"
    | "discord_user_id"
    | "member_id"
    | "respondent_email"
    | "respondent_name"
  )[];
}

export interface CallbackCatalogItem {
  available: boolean;
  description: string;
  inputs: CallbackCatalogInput[];
  label: string;
  requiredPermission: string;
  slug: string;
}
