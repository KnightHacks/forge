import type { RouterOutputs } from "@forge/api";
import { employmentHistorySchema } from "@forge/validators";

import type { CareerHistoryDraft } from "~/app/_components/member/employment-history-editor";
import { isPartialEmploymentMonth } from "~/app/_components/member/employment-month";

type CareerData = RouterOutputs["career"]["listMyEmployment"];

export interface CareerSettingsState {
  currentCityKey: string | null;
  currentCityLabel: string | null;
  guildLocationVisible: boolean;
  history: CareerHistoryDraft[];
}

/**
 * Seeds the editable career state from the server read. `draftId` reuses the
 * saved row id so an untouched entry keeps its identity across a re-render.
 */
export function careerSettingsStateFromCareerData(
  careerData: CareerData,
): CareerSettingsState {
  return {
    currentCityKey: careerData.currentLocation.currentCityKey,
    currentCityLabel: careerData.currentLocation.city?.label ?? null,
    guildLocationVisible: careerData.currentLocation.guildLocationVisible,
    history: careerData.employment.map((employment) => ({
      cityKey: employment.cityKey,
      cityLabel: employment.city?.label ?? null,
      companyId: employment.company.id,
      companyLabel: employment.company.displayName,
      draftId: employment.id,
      endMonth: employment.endMonth,
      experienceType: employment.experienceType,
      guildVisible: employment.guildVisible,
      proposedCompanyName: null,
      startMonth: employment.startMonth,
      state: employment.state,
      title: employment.title,
    })),
  };
}

/**
 * The persisted shape of the career state. Display-only fields are dropped so
 * relabelling a city or company does not read as an unsaved change.
 */
function careerSettingsSnapshot(state: CareerSettingsState) {
  return {
    currentCityKey: state.currentCityKey,
    guildLocationVisible: state.guildLocationVisible,
    history: state.history.map(
      ({
        cityLabel: _cityLabel,
        companyLabel: _companyLabel,
        draftId: _draftId,
        ...employment
      }) => employment,
    ),
  };
}

export function hasCareerSettingsChanged(
  current: CareerSettingsState,
  saved: CareerSettingsState,
) {
  return (
    JSON.stringify(careerSettingsSnapshot(current)) !==
    JSON.stringify(careerSettingsSnapshot(saved))
  );
}

/**
 * Legacy rows predate the current/former split, so they land with
 * `state: "unknown"` and no experience type and cannot be persisted as-is.
 */
export function careerHistoryValidationError(history: CareerHistoryDraft[]) {
  const unconfirmed = history.find(
    (employment) =>
      employment.state === "unknown" || !employment.experienceType,
  );
  if (unconfirmed) {
    return "Confirm whether each legacy entry is current or former before saving career history.";
  }

  for (const [index, employment] of history.entries()) {
    if (isPartialEmploymentMonth(employment.startMonth)) {
      return `Employment entry ${index + 1}: Choose both a month and year for the start month.`;
    }
    if (isPartialEmploymentMonth(employment.endMonth)) {
      return `Employment entry ${index + 1}: Choose both a month and year for the end month.`;
    }
  }

  const result = employmentHistorySchema.safeParse(
    careerHistoryMutationInput(history),
  );
  if (result.success) return null;

  const issue = result.error.issues[0];
  const entryIndex = issue?.path[0];
  const prefix =
    typeof entryIndex === "number"
      ? `Employment entry ${entryIndex + 1}: `
      : "";
  return `${prefix}${issue?.message ?? "Check your career history and try again."}`;
}

/**
 * tRPC uses Zod's serialized issue array as the default message for input
 * parse failures. Keep those implementation details out of the settings UI and
 * surface the first actionable validation message instead.
 */
export function careerSaveErrorMessage(error: unknown) {
  const fallback = "Career history could not be saved.";
  if (!(error instanceof Error) || !error.message.trim()) return fallback;

  try {
    const parsed: unknown = JSON.parse(error.message);
    if (!Array.isArray(parsed)) return fallback;
    const firstMessage = parsed.flatMap((issue) => {
      if (typeof issue !== "object" || issue === null) return [];
      const message: unknown = (issue as Record<string, unknown>).message;
      return typeof message === "string" && message.trim() ? [message] : [];
    })[0];
    return firstMessage?.trim() || fallback;
  } catch {
    return error.message;
  }
}

/**
 * Narrows the drafts to the mutation input. Throws on an unconfirmed entry,
 * which `careerHistoryValidationError` is expected to have caught first.
 */
export function careerHistoryMutationInput(history: CareerHistoryDraft[]) {
  return history.map(
    ({
      cityLabel: _cityLabel,
      companyLabel: _companyLabel,
      draftId: _draftId,
      ...employment
    }) => {
      const experienceType = employment.experienceType;
      if (!experienceType) {
        throw new Error("Choose an experience type.");
      }
      return {
        ...employment,
        experienceType,
        state: employment.state as "current" | "past",
        title: employment.title ?? "",
      };
    },
  );
}
