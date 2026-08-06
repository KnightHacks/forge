import { FORMS } from "@forge/consts";

const PROTECTED_CATEGORIES = new Set([
  "Prefer not to answer",
  "Missing",
  "Invalid",
  "Unknown",
  "Not applicable",
]);

const COLOR_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

interface CalendarDate {
  day: number;
  month: number;
  year: number;
}

function parseCalendarDate(value: Date | string | null): CalendarDate | null {
  if (value === null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return easternCalendarDate(value);
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() + 1 !== month ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }
  return { day, month, year };
}

function easternCalendarDate(value: Date): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "numeric",
    timeZone: "America/New_York",
    year: "numeric",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);
  return { day: part("day"), month: part("month"), year: part("year") };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function deriveAgeBand(dob: Date | string | null, referenceDate: Date) {
  if (dob === null || (typeof dob === "string" && dob.trim() === ""))
    return "Missing";
  const birth = parseCalendarDate(dob);
  if (!birth || Number.isNaN(referenceDate.getTime())) return "Invalid";
  const reference = easternCalendarDate(referenceDate);
  const anniversaryDay = Math.min(
    birth.day,
    daysInMonth(reference.year, birth.month),
  );
  let age = reference.year - birth.year;
  if (
    reference.month < birth.month ||
    (reference.month === birth.month && reference.day < anniversaryDay)
  ) {
    age -= 1;
  }
  if (age < 0 || age > 120) return "Invalid";
  if (age < 18) return "Under 18";
  if (age <= 20) return "18-20";
  if (age <= 24) return "21-24";
  if (age <= 34) return "25-34";
  return "35+";
}

function academicYear(date: CalendarDate) {
  return date.month >= 8 ? date.year : date.year - 1;
}

export function inferAcademicYear(
  graduationDate: Date | string | null,
  levelOfStudy: string | null,
  referenceDate: Date,
) {
  if (
    graduationDate === null ||
    (typeof graduationDate === "string" && graduationDate.trim() === "")
  ) {
    return "Unknown";
  }
  const graduation = parseCalendarDate(graduationDate);
  if (!graduation || Number.isNaN(referenceDate.getTime())) return "Invalid";
  const reference = easternCalendarDate(referenceDate);
  const graduationEpoch = Date.UTC(
    graduation.year,
    graduation.month - 1,
    graduation.day,
  );
  const referenceEpoch = Date.UTC(
    reference.year,
    reference.month - 1,
    reference.day,
  );
  if (graduationEpoch < referenceEpoch) return "Graduated / alumni";

  const remaining = academicYear(graduation) - academicYear(reference);
  const normalizedLevel = levelOfStudy?.trim() ?? "";
  if (normalizedLevel === "Undergraduate University (3+ year)") {
    if (remaining >= 3) return "Freshman (inferred)";
    if (remaining === 2) return "Sophomore (inferred)";
    if (remaining === 1) return "Junior (inferred)";
    return "Senior (inferred)";
  }
  if (
    normalizedLevel === "Undergraduate University (2 year)" ||
    normalizedLevel ===
      "Undergraduate University (2 year - community college or similar)"
  ) {
    return remaining >= 1
      ? "First year - 2-year program (inferred)"
      : "Second year - 2-year program (inferred)";
  }
  if (normalizedLevel === "") return "Unknown";
  if (
    normalizedLevel === "Less than Secondary / High School" ||
    normalizedLevel === "Secondary / High School"
  ) {
    return "High school (not inferred)";
  }
  if (
    normalizedLevel ===
      "Graduate University (Masters, Professional, Doctoral, etc)" ||
    normalizedLevel === "Post Doctorate"
  ) {
    return "Graduate / postdoctoral (not inferred)";
  }
  if (
    normalizedLevel === "Code School / Bootcamp" ||
    normalizedLevel === "Other Vocational / Trade Program or Apprenticeship"
  ) {
    return "Bootcamp / trade (not inferred)";
  }
  if (normalizedLevel === "I’m not currently a student") {
    return "Not currently a student";
  }
  if (normalizedLevel === "Other") return "Other";
  if (normalizedLevel === "Prefer not to answer") return normalizedLevel;
  return "Not applicable";
}

export interface CompositionRow {
  category: string;
  count: number;
}

export interface CompositionSlice extends CompositionRow {
  color: string;
  protected: boolean;
}

export function stableCategoryColor(category: string) {
  let hash = 2166136261;
  for (const character of category.normalize("NFKC")) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (
    COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length] ?? COLOR_PALETTE[0]
  );
}

function toSlice(row: CompositionRow): CompositionSlice {
  return {
    ...row,
    color: stableCategoryColor(row.category),
    protected: PROTECTED_CATEGORIES.has(row.category),
  };
}

export function buildCompositionSlices(rows: readonly CompositionRow[]) {
  const aggregated = new Map<string, number>();
  rows.forEach((row) => {
    aggregated.set(
      row.category,
      (aggregated.get(row.category) ?? 0) + row.count,
    );
  });
  const canonicalRows = [...aggregated.entries()].map(([category, count]) => ({
    category,
    count,
  }));
  const protectedRows = [...PROTECTED_CATEGORIES]
    .map((category) => ({ category, count: aggregated.get(category) ?? 0 }))
    .filter((row) => row.count !== 0);
  const storedOther = canonicalRows.filter((row) => row.category === "Other");
  const substantive = canonicalRows
    .filter(
      (row) =>
        !PROTECTED_CATEGORIES.has(row.category) && row.category !== "Other",
    )
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.category
          .normalize("NFKC")
          .localeCompare(right.category.normalize("NFKC")),
    );
  const needsTail = substantive.length + storedOther.length > 9;
  const keepCount = needsTail
    ? Math.max(0, 9 - storedOther.length - 1)
    : substantive.length;
  const kept = substantive.slice(0, keepCount);
  const tailCount = substantive
    .slice(keepCount)
    .reduce((sum, row) => sum + row.count, 0);
  const result = [
    ...kept,
    ...storedOther,
    ...(tailCount > 0
      ? [{ category: "Other categories", count: tailCount }]
      : []),
    ...protectedRows,
  ];
  return result.map(toSlice);
}

export function filterCategoryRows<T extends { category: string }>(
  rows: readonly T[],
  query: string,
) {
  const normalizedQuery = query.trim().normalize("NFC").toLocaleLowerCase();
  if (!normalizedQuery) return [...rows];
  return rows.filter((row) =>
    row.category.normalize("NFC").toLocaleLowerCase().includes(normalizedQuery),
  );
}

const DIETARY_ALIASES = new Map<string, string>([
  ["dairy", "Milk"],
  ["egg", "Eggs"],
  ["shellfish", "Crustacean Shellfish"],
  ["tree nut", "Tree Nuts"],
  ["peanut", "Peanuts"],
  ["soy", "Soybeans"],
  ["soybean", "Soybeans"],
]);

const DIETARY_CANONICAL = new Map(
  FORMS.ALLERGIES.map((value) => [
    value.normalize("NFKC").toLocaleLowerCase(),
    value,
  ]),
);

export function parseDietaryResponse(value: string | null) {
  if (value === null || value.trim() === "") {
    return { hasOtherResponse: false, tags: ["No response recorded"] };
  }
  const tags = new Set<string>();
  const tokens = value
    .normalize("NFKC")
    .split(/[,;|\n]/)
    .map((token) => token.trim().toLocaleLowerCase())
    .filter(Boolean);
  let hasOtherResponse = tokens.length === 0;
  tokens.forEach((token) => {
    const canonical =
      DIETARY_CANONICAL.get(token) ?? DIETARY_ALIASES.get(token);
    if (canonical) tags.add(canonical);
    else hasOtherResponse = true;
  });
  return {
    hasOtherResponse,
    tags: [...tags],
  };
}
