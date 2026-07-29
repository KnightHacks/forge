import { localDateTime } from "./form-builder-formatting";

/**
 * Availability and access is one record, not seven fields. The builder edits
 * exactly the seven values `forms.updateSettings` accepts, they are seeded from
 * the same saved form together, and no handler touches one without the others
 * being on screen beside it — so they are held in a single `useState` with a
 * typed `update(key, value)`, the shape `event-form-dialog.tsx` already uses.
 */

export type FormResponseMode =
  | "multiple_locked"
  | "single_editable"
  | "single_locked";

/** The seven settings as the saved form stores them: instants, or nothing. */
export interface FormAvailabilitySource {
  closesAt: string | null;
  duesOnly: boolean;
  manuallyClosed: boolean;
  opensAt: string | null;
  respondentRoleIds: string[];
  responseMode: FormResponseMode;
  sectionId: string;
}

/** The same seven as the builder's inputs read them. */
export interface FormAvailability extends Omit<
  FormAvailabilitySource,
  "closesAt" | "opensAt"
> {
  closesAt: string;
  opensAt: string;
}

/**
 * The availability a builder opens with. A form being created has no saved
 * settings, so it starts locked to one response, open to every eligible member,
 * on an unbounded schedule, and in the first section the author can post to —
 * an empty section would fail the save rather than default to something the
 * author did not choose.
 */
export function draftAvailability(
  initial: FormAvailabilitySource | undefined,
  sections: { id: string }[],
): FormAvailability {
  return {
    closesAt: localDateTime(initial?.closesAt ?? null),
    duesOnly: initial?.duesOnly ?? false,
    manuallyClosed: initial?.manuallyClosed ?? false,
    opensAt: localDateTime(initial?.opensAt ?? null),
    respondentRoleIds: initial?.respondentRoleIds ?? [],
    responseMode: initial?.responseMode ?? "single_locked",
    sectionId: initial?.sectionId ?? sections[0]?.id ?? "",
  };
}
