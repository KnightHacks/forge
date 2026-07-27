import { graduationTermYearFromDate } from "@forge/validators";

export interface ResumeBundleMember {
  firstName: string;
  gradDate: Date | string;
  id: string;
  lastName: string;
  major: string;
  school: string;
}

export interface ResumeBundlePlanEntry {
  fileName: string;
  memberId: string;
  paths: [string, string, string, string];
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
): ResumeBundlePlanEntry[] {
  const fileNameCounts = new Map<string, number>();

  return members.map((member) => {
    const { gradTerm, gradYear } = graduationTermYearFromDate(member.gradDate);
    const stem = [
      sanitizeFileToken(member.firstName, "Unknown"),
      sanitizeFileToken(member.lastName, "Member"),
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

    return {
      fileName,
      memberId: member.id,
      paths: [
        `All/${fileName}`,
        `Grad Term/${gradTermYear}/${fileName}`,
        `University/${sanitizeArchiveSegment(member.school, "Unknown")}/${fileName}`,
        `Major/${sanitizeArchiveSegment(member.major, "Unknown")}/${fileName}`,
      ],
    };
  });
}
