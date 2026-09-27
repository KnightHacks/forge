import { FORMS } from "@forge/consts";

export interface SchoolChoice {
  kind: "catalog" | "custom";
  label: string;
  value: string;
}

const CUSTOM_SCHOOL_VALUE = "__custom_school__";
const schoolCatalog = new Set<string>(FORMS.SCHOOLS);

export const SCHOOL_CHOICES: readonly SchoolChoice[] = [
  {
    kind: "custom",
    label: "Other school — enter manually",
    value: CUSTOM_SCHOOL_VALUE,
  },
  ...FORMS.SCHOOLS.map((school) => ({
    kind: "catalog" as const,
    label: school,
    value: school,
  })),
];

export function isCustomSchoolValue(value: string | null | undefined) {
  const normalizedValue = value?.trim();
  return Boolean(normalizedValue && !schoolCatalog.has(normalizedValue));
}

export function getSchoolChoiceSearchValue(
  choice: SchoolChoice,
  searchValue: string,
) {
  return choice.kind === "custom"
    ? `${choice.label} ${searchValue}`
    : choice.label;
}
