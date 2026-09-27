import type { RouterOutputs } from "@forge/api";
import { employmentHistorySchema } from "@forge/validators";

import type { CareerHistoryDraft } from "~/app/_components/member/employment-history-editor";

type CareerData = RouterOutputs["career"]["listMyEmployment"];

export interface CareerSettingsState {
  currentCityKey: string | null;
  currentCityLabel: string | null;
  guildLocationVisible: boolean;
  history: CareerHistoryDraft[];
}

export type CareerHistoryValidationField =
  | "cityKey"
  | "company"
  | "endMonth"
  | "experienceType"
  | "startMonth"
  | "state"
  | "title";

export interface CareerHistoryValidationIssue {
  draftId: string | null;
  entryIndex: number | null;
  field: CareerHistoryValidationField | null;
  fieldLabel: string;
  message: string;
}

export interface CareerHistoryValidationResult {
  issues: CareerHistoryValidationIssue[];
  legacyDraftIds: string[];
}

const CAREER_FIELD_META = {
  cityKey: { label: "City", order: 6 },
  company: { label: "Company", order: 0 },
  endMonth: { label: "End month", order: 5 },
  experienceType: { label: "Experience type", order: 2 },
  startMonth: { label: "Start month", order: 4 },
  state: { label: "Employment status", order: 3 },
  title: { label: "Position title", order: 1 },
} satisfies Record<
  CareerHistoryValidationField,
  { label: string; order: number }
>;

function careerValidationField(
  path: PropertyKey | undefined,
): CareerHistoryValidationField | null {
  if (path === "companyId" || path === "proposedCompanyName") return "company";
  if (
    path === "cityKey" ||
    path === "endMonth" ||
    path === "experienceType" ||
    path === "startMonth" ||
    path === "state" ||
    path === "title"
  ) {
    return path;
  }
  return null;
}

function careerValidationMessage(
  field: CareerHistoryValidationField | null,
  schemaMessage: string,
) {
  if (field === "experienceType") return "Choose an experience type.";
  if (field === "state") {
    return "Choose whether this employment is current or former.";
  }
  return schemaMessage;
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

function careerHistorySchemaInput(history: CareerHistoryDraft[]) {
  return history.map(
    ({
      cityLabel: _cityLabel,
      companyLabel: _companyLabel,
      draftId: _draftId,
      ...employment
    }) => ({
      ...employment,
      title: employment.title ?? "",
    }),
  );
}

export function validateCareerHistory(
  history: CareerHistoryDraft[],
): CareerHistoryValidationResult {
  const result = employmentHistorySchema.safeParse(
    careerHistorySchemaInput(history),
  );
  const legacyDraftIds = history
    .filter((employment) => employment.state === "unknown")
    .map((employment) => employment.draftId);

  if (result.success) return { issues: [], legacyDraftIds };

  const issues = result.error.issues.map((issue) => {
    const entryIndex = issue.path[0];
    const resolvedEntryIndex =
      typeof entryIndex === "number" ? entryIndex : null;
    const draft =
      resolvedEntryIndex === null ? null : history[resolvedEntryIndex];
    const field = careerValidationField(issue.path[1]);
    return {
      draftId: draft?.draftId ?? null,
      entryIndex: resolvedEntryIndex,
      field,
      fieldLabel: field ? CAREER_FIELD_META[field].label : "Employment history",
      message: careerValidationMessage(field, issue.message),
    } satisfies CareerHistoryValidationIssue;
  });

  const uniqueIssues = issues
    .filter(
      (issue, index) =>
        issues.findIndex(
          (candidate) =>
            candidate.draftId === issue.draftId &&
            candidate.field === issue.field,
        ) === index,
    )
    .sort((left, right) => {
      const entryDifference =
        (left.entryIndex ?? Number.MAX_SAFE_INTEGER) -
        (right.entryIndex ?? Number.MAX_SAFE_INTEGER);
      if (entryDifference !== 0) return entryDifference;
      return (
        (left.field ? CAREER_FIELD_META[left.field].order : 99) -
        (right.field ? CAREER_FIELD_META[right.field].order : 99)
      );
    });

  return { issues: uniqueIssues, legacyDraftIds };
}

export function careerHistoryFirstIssueSummary(
  validation: CareerHistoryValidationResult,
) {
  const firstIssue = validation.issues[0];
  if (!firstIssue) return null;
  if (firstIssue.entryIndex === null || firstIssue.field === null) {
    return firstIssue.message;
  }
  return `Employment entry ${firstIssue.entryIndex + 1}, ${firstIssue.fieldLabel}: ${firstIssue.message}`;
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
 * Narrows drafts to the mutation input after `validateCareerHistory` succeeds.
 * It still rejects a missing experience type to keep this boundary safe when
 * called independently.
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
