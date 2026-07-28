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

export interface CallbackCatalogItem {
  available: boolean;
  description: string;
  label: string;
  requiredPermission: string;
  slug: string;
}
