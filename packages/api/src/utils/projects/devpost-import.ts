import { parse } from "csv-parse/sync";

const REQUIRED_HEADERS = [
  "Opt-In Prize",
  "Project Title",
  "Submission Url",
  "Project Status",
  "Project Created At",
  "Project Submitted At",
  "Submitter First Name",
  "Submitter Last Name",
  "Submitter Email",
  "Additional Team Member Count",
] as const;

export class ProjectImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectImportError";
  }
}

export interface ParsedProjectMember {
  email: string | null;
  name: string;
  order: number;
}

export interface ParsedProject {
  createdAt: Date;
  demoLinks: string[];
  description: string;
  members: ParsedProjectMember[];
  participantCount: number;
  prizeCategories: string[];
  submissionUrl: string;
  submittedAt: Date;
  technologies: string[];
  title: string;
  universities: string[];
  videoUrl: string | null;
}

export interface ProjectImportRejection {
  project: string;
  reason: string;
}

export interface ParsedProjectImport {
  challengeLabels: string[];
  counts: {
    collapsedDuplicateRows: number;
    excludedDraftProjects: number;
    importedProjects: number;
    rejectedProjects: number;
  };
  projects: ParsedProject[];
  rejections: ProjectImportRejection[];
}

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

function bounded(value: string, label: string, maxLength: number) {
  if (value.length > maxLength) {
    throw new ProjectImportError(`${label} is too long.`);
  }
  return value;
}

function challengeLabel(value: string | undefined) {
  const label = clean(value);
  if (!label) return "";
  if (/\p{Cc}/u.test(label)) {
    throw new ProjectImportError("Challenge label contains unsafe characters.");
  }
  return bounded(label, "Challenge label", 255);
}

function emailAddress(value: string, label: string) {
  bounded(value, label, 320);
  if (!/^\S+@\S+\.\S+$/u.test(value)) {
    throw new ProjectImportError(`${label} is not a valid email address.`);
  }
  return value;
}

function normalizedHttpUrl(value: string, label: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
    return url.toString();
  } catch {
    throw new ProjectImportError(`${label} is not a valid HTTP(S) URL.`);
  }
}

function optionalUrl(value: string | undefined, label: string) {
  const candidate = clean(value);
  return candidate ? normalizedHttpUrl(candidate, label) : null;
}

function parseDate(value: string | undefined, label: string) {
  const parsed = new Date(clean(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new ProjectImportError(`${label} is not a valid date.`);
  }
  return parsed;
}

function splitList(value: string | undefined) {
  return clean(value)
    .split(/[;,\n]+/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function projectLabel(title: string, rowNumber: number) {
  return title || `row ${rowNumber}`;
}

function safeReason(error: unknown) {
  return error instanceof Error ? error.message : "Project data is invalid.";
}

function readCsvRows(csvContent: string) {
  let rawRows: string[][];
  try {
    rawRows = parse(csvContent, {
      bom: true,
      relax_column_count: true,
      skip_empty_lines: true,
    });
  } catch {
    throw new ProjectImportError("The uploaded file is not valid CSV.");
  }

  const headerRow = rawRows[0];
  if (!headerRow) throw new ProjectImportError("The uploaded CSV is empty.");
  if (rawRows.length === 1) {
    throw new ProjectImportError("The uploaded CSV has no project rows.");
  }

  const headerIndex = new Map(
    headerRow.map((header, index) => [header, index]),
  );
  const missing = REQUIRED_HEADERS.filter((header) => !headerIndex.has(header));
  if (missing.length > 0) {
    throw new ProjectImportError(
      `The uploaded CSV is missing required columns: ${missing.join(", ")}.`,
    );
  }
  return { headerIndex, rawRows };
}

export function parseDevpostProjects(csvContent: string): ParsedProjectImport {
  const { headerIndex, rawRows } = readCsvRows(csvContent);

  const at = (row: string[], header: string) => {
    const index = headerIndex.get(header);
    return index === undefined ? undefined : row[index];
  };
  const groups = new Map<string, { row: string[]; rowNumber: number }[]>();
  const draftOnlyUrls = new Set<string>();
  let collapsedDuplicateRows = 0;
  const rejections: ProjectImportRejection[] = [];

  rawRows.slice(1).forEach((row, offset) => {
    const rowNumber = offset + 2;
    const title = clean(at(row, "Project Title"));
    const urlValue = clean(at(row, "Submission Url"));
    const status = clean(at(row, "Project Status"));
    if (!urlValue) {
      if (status.toLocaleLowerCase("en-US").startsWith("submitted")) {
        rejections.push({
          project: projectLabel(title, rowNumber),
          reason: "Submitted project is missing its submission URL.",
        });
      }
      return;
    }

    let url: string;
    try {
      url = normalizedHttpUrl(urlValue, "Submission URL");
    } catch (error) {
      rejections.push({
        project: projectLabel(title, rowNumber),
        reason: safeReason(error),
      });
      return;
    }

    if (!status.toLocaleLowerCase("en-US").startsWith("submitted")) {
      draftOnlyUrls.add(url);
      return;
    }

    const existing = groups.get(url);
    if (existing) {
      existing.push({ row, rowNumber });
      collapsedDuplicateRows += 1;
    } else {
      groups.set(url, [{ row, rowNumber }]);
    }
  });

  const projects: ParsedProject[] = [];
  const allChallengeLabels = new Set<string>(["General"]);
  const additionalCountIndex = headerIndex.get("Additional Team Member Count");
  if (additionalCountIndex === undefined) {
    throw new ProjectImportError(
      "The uploaded CSV is missing the team member count column.",
    );
  }

  for (const [submissionUrl, rows] of groups) {
    const first = rows[0];
    if (!first) continue;
    const title = clean(at(first.row, "Project Title"));
    try {
      if (!title) throw new ProjectImportError("Project title is required.");
      bounded(title, "Project title", 255);
      const description = clean(at(first.row, "About The Project"));
      bounded(description, "Project description", 50_000);
      const submitterEmail = clean(at(first.row, "Submitter Email"));
      const identity = JSON.stringify({
        description,
        submitterEmail,
        title,
      });
      const conflicting = rows.some(
        ({ row }) =>
          identity !==
          JSON.stringify({
            description: clean(at(row, "About The Project")),
            submitterEmail: clean(at(row, "Submitter Email")),
            title: clean(at(row, "Project Title")),
          }),
      );
      if (conflicting) {
        throw new ProjectImportError(
          "Submitted rows for this URL contain conflicting project data.",
        );
      }

      const additionalCount = Number(
        clean(at(first.row, "Additional Team Member Count")) || "0",
      );
      if (
        !Number.isInteger(additionalCount) ||
        additionalCount < 0 ||
        additionalCount > 99
      ) {
        throw new ProjectImportError("Participant count is invalid.");
      }

      const members: ParsedProjectMember[] = [];
      const submitterName = [
        clean(at(first.row, "Submitter First Name")),
        clean(at(first.row, "Submitter Last Name")),
      ]
        .filter(Boolean)
        .join(" ");
      if (!submitterName || !submitterEmail) {
        throw new ProjectImportError("Submitter name and email are required.");
      }
      members.push({
        email: emailAddress(submitterEmail, "Submitter email"),
        name: bounded(submitterName, "Submitter name", 255),
        order: 0,
      });

      for (
        let memberIndex = 0;
        memberIndex < additionalCount;
        memberIndex += 1
      ) {
        const start = additionalCountIndex + 1 + memberIndex * 3;
        const name = [clean(first.row[start]), clean(first.row[start + 1])]
          .filter(Boolean)
          .join(" ");
        const email = clean(first.row[start + 2]);
        if (!name && !email) continue;
        if (!name || !email) {
          throw new ProjectImportError(
            "Team member name and email must be provided together.",
          );
        }
        members.push({
          email: emailAddress(email, "Team member email"),
          name: bounded(name, "Team member name", 255),
          order: members.length,
        });
      }

      const prizeCategories = Array.from(
        new Set(
          rows
            .map(({ row }) => challengeLabel(at(row, "Opt-In Prize")))
            .filter(Boolean),
        ),
      ).sort();
      for (const challenge of prizeCategories)
        allChallengeLabels.add(challenge);

      const demoLinks = splitList(at(first.row, '"Try it out" Links')).map(
        (url, index) => normalizedHttpUrl(url, `Demo link ${index + 1}`),
      );

      projects.push({
        createdAt: parseDate(
          at(first.row, "Project Created At"),
          "Project created timestamp",
        ),
        demoLinks,
        description,
        members,
        participantCount: additionalCount + 1,
        prizeCategories,
        submissionUrl,
        submittedAt: parseDate(
          at(first.row, "Project Submitted At"),
          "Project submitted timestamp",
        ),
        technologies: splitList(at(first.row, "Built With")),
        title,
        universities: splitList(
          at(first.row, "Team Colleges/Universities") ??
            at(
              first.row,
              "List All Of The Universities Or Schools That Your Team Members Currently Attend.",
            ),
        ),
        videoUrl: optionalUrl(at(first.row, "Video Demo Link"), "Video link"),
      });
    } catch (error) {
      rejections.push({
        project: title || submissionUrl,
        reason: safeReason(error),
      });
    }
  }

  if (projects.length === 0) {
    throw new ProjectImportError(
      rejections.length > 0
        ? "The uploaded CSV contains no valid submitted projects to import."
        : "The uploaded CSV contains no submitted projects to import.",
    );
  }

  return {
    challengeLabels: Array.from(allChallengeLabels).sort(),
    counts: {
      collapsedDuplicateRows,
      excludedDraftProjects: Array.from(draftOnlyUrls).filter(
        (url) => !groups.has(url),
      ).length,
      importedProjects: projects.length,
      rejectedProjects: rejections.length,
    },
    projects,
    rejections,
  };
}
