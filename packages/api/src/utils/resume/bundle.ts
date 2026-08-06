import { graduationTermYearFromDate } from "@forge/validators";

import { deriveAgeBand } from "../analytics/demographics";

export interface ResumeBundleMember {
  dob?: Date | string | null;
  firstName: string;
  gender?: string | null;
  gradDate: Date | string | null;
  id: string;
  inferredYearOfStudy?: string | null;
  lastName: string;
  levelOfStudy?: string | null;
  major: string;
  raceOrEthnicity?: string | null;
  school: string;
}

export interface ResumeBundlePlanEntry {
  fileName: string;
  memberId: string;
  paths: string[];
}

export interface ResumeBundlePart {
  expandedBytes: number;
  indexes: number[];
  partNumber: number;
  sourceBytes: number;
  sourceCount: number;
}

export const RESUME_PART_MAX_SOURCE_COUNT = 250;
export const RESUME_PART_MAX_SOURCE_BYTES = 256 * 1024 * 1024;
export const RESUME_PART_MAX_EXPANDED_BYTES = 1024 * 1024 * 1024;

export function sortResumeBundleCandidates<
  T extends {
    firstName: string;
    id: string;
    lastName: string;
    profileId?: string;
  },
>(rows: readonly T[]) {
  const normalized = (value: string) => value.normalize("NFKC");
  return [...rows].sort(
    (left, right) =>
      normalized(left.lastName).localeCompare(normalized(right.lastName)) ||
      normalized(left.firstName).localeCompare(normalized(right.firstName)) ||
      (left.profileId ?? left.id).localeCompare(right.profileId ?? right.id),
  );
}

/** Partitions an already deterministic plan without dropping any valid PDF. */
export function createResumeBundleParts(
  plan: readonly ResumeBundlePlanEntry[],
  sourceBytes: readonly number[],
) {
  if (plan.length !== sourceBytes.length) {
    throw new Error("Resume plan and source-size rows must align.");
  }
  const parts: ResumeBundlePart[] = [];
  let current: Omit<ResumeBundlePart, "partNumber"> = {
    expandedBytes: 0,
    indexes: [],
    sourceBytes: 0,
    sourceCount: 0,
  };
  const commit = () => {
    if (current.sourceCount === 0) return;
    parts.push({ ...current, partNumber: parts.length + 1 });
    current = {
      expandedBytes: 0,
      indexes: [],
      sourceBytes: 0,
      sourceCount: 0,
    };
  };
  plan.forEach((entry, index) => {
    const sourceSize = sourceBytes[index] ?? 0;
    if (!Number.isSafeInteger(sourceSize) || sourceSize <= 0) {
      throw new Error("Resume source sizes must be positive safe integers.");
    }
    const expandedSize = sourceSize * entry.paths.length;
    const wouldOverflow =
      current.sourceCount > 0 &&
      (current.sourceCount + 1 > RESUME_PART_MAX_SOURCE_COUNT ||
        current.sourceBytes + sourceSize > RESUME_PART_MAX_SOURCE_BYTES ||
        current.expandedBytes + expandedSize > RESUME_PART_MAX_EXPANDED_BYTES);
    if (wouldOverflow) commit();
    current.indexes.push(index);
    current.sourceCount += 1;
    current.sourceBytes += sourceSize;
    current.expandedBytes += expandedSize;
  });
  commit();
  return parts;
}

function calendarDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addCalendarMonths(date: Date, months: number) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

function easternCalendarDay(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "numeric",
    timeZone: "America/New_York",
    year: "numeric",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);
  return new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
}

function recruitingHorizon(
  gradDate: Date | string | null,
  generationDate: Date,
) {
  if (gradDate === null || gradDate === "") return "Unknown";
  const graduation = calendarDate(gradDate);
  if (!graduation) return "Invalid";
  const normalizedGraduation = new Date(
    Date.UTC(
      graduation.getUTCFullYear(),
      graduation.getUTCMonth(),
      graduation.getUTCDate(),
    ),
  );
  const normalizedGeneration = easternCalendarDay(generationDate);
  if (normalizedGraduation < normalizedGeneration) {
    return "Graduation date passed";
  }
  if (normalizedGraduation <= addCalendarMonths(normalizedGeneration, 12)) {
    return "Graduating within 12 months";
  }
  if (normalizedGraduation <= addCalendarMonths(normalizedGeneration, 24)) {
    return "Graduating in 13-24 months";
  }
  return "Graduating in 25+ months";
}

function sanitizeArchiveSegment(value: string, fallback: string) {
  const withoutControlCharacters = Array.from(value.normalize("NFKC"))
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 32 && codePoint !== 127;
    })
    .join("");
  const normalized = withoutControlCharacters
    .replaceAll(/[/\\<>:"|?*]/g, "-")
    .replaceAll(/\s+/g, " ")
    .replaceAll(/^\.+|\.+$/g, "")
    .trim()
    .slice(0, 96);
  return normalized || fallback;
}

function sanitizeFileToken(value: string, fallback: string) {
  return sanitizeArchiveSegment(value, fallback).replaceAll(/\s+/g, "_");
}

export function createResumeBundlePlan(
  members: readonly ResumeBundleMember[],
  generationDate = new Date(),
): ResumeBundlePlanEntry[] {
  const fileNameCounts = new Map<string, number>();

  return members.map((member) => {
    const validGradDate = calendarDate(member.gradDate);
    const { gradTerm, gradYear } = validGradDate
      ? graduationTermYearFromDate(validGradDate)
      : {
          gradTerm: member.gradDate ? "Invalid" : "Unknown",
          gradYear: "Unknown",
        };
    const stem = [
      sanitizeFileToken(member.lastName, "Member"),
      sanitizeFileToken(member.firstName, "Unknown"),
      sanitizeFileToken(gradTerm, "Term"),
      gradYear,
    ].join("_");
    const fileNameCount = (fileNameCounts.get(stem) ?? 0) + 1;
    fileNameCounts.set(stem, fileNameCount);
    const fileName =
      fileNameCount === 1 ? `${stem}.pdf` : `${stem}_${fileNameCount}.pdf`;
    const gradTermYear = sanitizeArchiveSegment(
      `${gradTerm} ${gradYear}`,
      "Unknown",
    );
    const derivedAgeBand = deriveAgeBand(member.dob ?? null, generationDate);
    const ageBand = derivedAgeBand === "Missing" ? "Unknown" : derivedAgeBand;

    return {
      fileName,
      memberId: member.id,
      paths: [
        `00 All resumes/${fileName}`,
        `01 Recruiting horizon/${sanitizeArchiveSegment(recruitingHorizon(member.gradDate, generationDate), "Unknown")}/${fileName}`,
        `02 Graduation term/${gradTermYear}/${fileName}`,
        `03 Inferred academic year/${sanitizeArchiveSegment(member.inferredYearOfStudy ?? "Unknown", "Unknown")}/${fileName}`,
        `04 Level of study/${sanitizeArchiveSegment(member.levelOfStudy ?? "Unknown", "Unknown")}/${fileName}`,
        `05 Major/${sanitizeArchiveSegment(member.major, "Unknown")}/${fileName}`,
        `06 University/${sanitizeArchiveSegment(member.school, "Unknown")}/${fileName}`,
        `07 Demographics/Age band/${sanitizeArchiveSegment(ageBand, "Unknown")}/${fileName}`,
        `07 Demographics/Gender/${sanitizeArchiveSegment(member.gender ?? "Unknown", "Unknown")}/${fileName}`,
        `07 Demographics/Race or ethnicity/${sanitizeArchiveSegment(member.raceOrEthnicity ?? "Unknown", "Unknown")}/${fileName}`,
      ],
    };
  });
}
