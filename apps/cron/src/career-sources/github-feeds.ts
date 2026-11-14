import { JOB_BOARD } from "@forge/consts";

type GitHubFeedFormat = "markdown" | "json";

export interface GitHubJobFeed {
  boardKey: string;
  label: string;
  repository: string;
  branch: string;
  path: string;
  track: JOB_BOARD.JobTrack;
  format: GitHubFeedFormat;
}

export interface RawCareerJobListing {
  externalId: string;
  track: JOB_BOARD.JobTrack;
  companyLabel: string;
  title: string;
  applyUrl: string;
  postedAt?: Date;
  locationTexts: string[];
  sourceUrl: string;
  sourceData: Record<string, unknown>;
}

export interface CareerJobSourceSnapshot {
  source: {
    provider: "github";
    boardKey: string;
    label: string;
  };
  fetchedAt: Date;
  complete: true;
  listings: RawCareerJobListing[];
}

export const GITHUB_JOB_FEEDS = [
  {
    boardKey: "simplify_internships",
    label: "Simplify internships",
    repository: "SimplifyJobs/Summer2027-Internships",
    branch: "dev",
    path: "README.md",
    track: "internship",
    format: "markdown",
  },
  {
    boardKey: "simplify_new_grad",
    label: "Simplify new grad",
    repository: "SimplifyJobs/New-Grad-Positions",
    branch: "dev",
    path: "README.md",
    track: "new_grad",
    format: "markdown",
  },
  {
    boardKey: "simplify_offseason_internships",
    label: "Simplify off-season internships",
    repository: "SimplifyJobs/Summer2027-Internships",
    branch: "dev",
    path: "README-Off-Season.md",
    track: "internship",
    format: "markdown",
  },
  {
    boardKey: "speedy_internships",
    label: "SpeedyApply internships",
    repository: "speedyapply/2027-SWE-College-Jobs",
    branch: "main",
    path: "README.md",
    track: "internship",
    format: "markdown",
  },
  {
    boardKey: "speedy_new_grad",
    label: "SpeedyApply new grad",
    repository: "speedyapply/2027-SWE-College-Jobs",
    branch: "main",
    path: "NEW_GRAD_USA.md",
    track: "new_grad",
    format: "markdown",
  },
  {
    boardKey: "sndsh_internships",
    label: "Summer 2027 list",
    repository: "sndsh404/summer-2027-internships",
    branch: "main",
    path: "README.md",
    track: "internship",
    format: "markdown",
  },
  {
    boardKey: "intern_engine",
    label: "Internship Engine JSON",
    repository:
      "zshah101/Automated-List-Of-Summer-2027-and-Fall-2026-Tech-Internships",
    branch: "main",
    path: "docs/api/jobs.json",
    track: "internship",
    format: "json",
  },
  {
    boardKey: "intern_engine_readme",
    label: "Internship Engine README",
    repository:
      "zshah101/Automated-List-Of-Summer-2027-and-Fall-2026-Tech-Internships",
    branch: "main",
    path: "README.md",
    track: "internship",
    format: "markdown",
  },
  {
    boardKey: "applyguy_internships",
    label: "ApplyGuy internships",
    repository: "ApplyGuy/2027-Internships",
    branch: "main",
    path: "data/internships.json",
    track: "internship",
    format: "json",
  },
  {
    boardKey: "applyguy_new_grad",
    label: "ApplyGuy new grad",
    repository: "ApplyGuy/2027-New-Grad-Jobs",
    branch: "main",
    path: "data/new-grad-jobs.json",
    track: "new_grad",
    format: "json",
  },
] as const satisfies readonly GitHubJobFeed[];

const FETCH_TIMEOUT_MS = 15_000;

const COLUMN_ALIASES = {
  company: ["company", "company_name", "employer"],
  title: ["role", "title", "position", "job_title"],
  applyUrl: [
    "application",
    "apply",
    "apply_link",
    "apply_url",
    "application_link",
    "application_url",
    "url",
    "link",
  ],
  postedDate: ["date_posted", "posted_date", "posted", "date", "date_added"],
  location: ["location", "locations", "office"],
  externalId: ["id", "job_id", "posting_id", "external_id"],
} as const;

const JSON_FIELD_ALIASES = {
  company: ["company", "company_name", "employer", "organization"],
  title: ["title", "role", "position", "job_title", "name"],
  applyUrl: [
    "apply_url",
    "application_url",
    "application_link",
    "job_url",
    "url",
    "link",
  ],
  postedDate: ["posted_date", "date_posted", "posted_at", "date", "created_at"],
  location: ["location", "locations", "work_location"],
  externalId: ["external_id", "job_id", "posting_id", "id"],
} as const;

export async function fetchAndParseGitHubJobFeed(
  feed: GitHubJobFeed,
  fetcher: typeof fetch = fetch,
): Promise<CareerJobSourceSnapshot> {
  const rawUrl = `https://raw.githubusercontent.com/${feed.repository}/${feed.branch}/${feed.path}`;
  const response = await fetcher(rawUrl, {
    headers: {
      Accept: "text/markdown, application/json;q=0.9, */*;q=0.8",
      "User-Agent":
        "KnightHacksForgeCron/1.0 (+https://github.com/KnightHacks/forge)",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `GitHub feed ${feed.boardKey} returned HTTP ${response.status}.`,
    );
  }

  const listings = parseGitHubJobFeed(feed, await response.text());
  return {
    source: {
      provider: "github",
      boardKey: feed.boardKey,
      label: feed.label,
    },
    fetchedAt: new Date(),
    complete: true,
    listings,
  };
}

export function parseGitHubJobFeed(
  feed: GitHubJobFeed,
  payload: string,
): RawCareerJobListing[] {
  if (!JOB_BOARD.JOB_TRACKS.includes(feed.track)) {
    throw new Error(`GitHub feed ${feed.boardKey} has an unsupported track.`);
  }

  const sourceUrl = `https://github.com/${feed.repository}/blob/${feed.branch}/${feed.path}`;

  return feed.format === "json"
    ? parseJsonFeed(feed, payload, sourceUrl)
    : parseMarkdownFeed(feed, payload, sourceUrl);
}

function parseMarkdownFeed(
  feed: GitHubJobFeed,
  markdown: string,
  sourceUrl: string,
): RawCareerJobListing[] {
  const lines = markdown.split(/\r?\n/);
  const listings: RawCareerJobListing[] = [];

  for (let index = 0; index < lines.length - 1; index++) {
    const headerCells = splitTableRow(lines[index] ?? "");
    const separatorCells = splitTableRow(lines[index + 1] ?? "");

    if (
      headerCells.length < 2 ||
      separatorCells.length !== headerCells.length ||
      !separatorCells.every(isTableSeparator)
    ) {
      continue;
    }

    const headers = headerCells.map(normalizeFieldName);
    if (
      findHeader(headers, COLUMN_ALIASES.company) === undefined ||
      findHeader(headers, COLUMN_ALIASES.title) === undefined
    ) {
      continue;
    }

    let rowIndex = index + 2;
    for (; rowIndex < lines.length; rowIndex++) {
      const line = lines[rowIndex] ?? "";
      if (!line.includes("|")) break;

      const cells = splitTableRow(line);
      if (cells.every((cell) => cell.trim().length === 0)) continue;
      if (cells.length !== headers.length) {
        throw new Error(
          `GitHub feed ${feed.boardKey} contains a malformed table row.`,
        );
      }

      const rawFields = Object.fromEntries(
        headerCells.map((header, cellIndex) => [
          header,
          cells[cellIndex] ?? "",
        ]),
      );
      listings.push(
        listingFromMarkdownRow(feed, headers, cells, rawFields, sourceUrl),
      );
    }

    index = rowIndex - 1;
  }

  if (listings.length === 0 && !hasSupportedMarkdownTable(lines)) {
    throw new Error(`GitHub feed ${feed.boardKey} has no supported job table.`);
  }

  return listings;
}

function listingFromMarkdownRow(
  feed: GitHubJobFeed,
  headers: string[],
  cells: string[],
  sourceData: Record<string, unknown>,
  sourceUrl: string,
): RawCareerJobListing {
  const rawCompany = findCell(headers, cells, COLUMN_ALIASES.company);
  const rawTitle = findCell(headers, cells, COLUMN_ALIASES.title);
  const rawApplyUrl = findCell(headers, cells, COLUMN_ALIASES.applyUrl);
  const rawLocation = findCell(headers, cells, COLUMN_ALIASES.location);
  const rawPostedDate = findCell(headers, cells, COLUMN_ALIASES.postedDate);
  const rawExternalId = findCell(headers, cells, COLUMN_ALIASES.externalId);

  const companyLabel = cleanMarkdownText(rawCompany);
  const title = cleanMarkdownText(rawTitle);
  const postedAt = parsePostedAt(cleanMarkdownText(rawPostedDate));
  const applyUrl = safeHttpUrl(
    linkUrl(rawApplyUrl) ?? linkUrl(rawTitle) ?? cleanMarkdownText(rawApplyUrl),
  );
  if (!companyLabel) {
    throw new Error(`GitHub feed ${feed.boardKey} row is missing company.`);
  }
  if (!title) {
    throw new Error(`GitHub feed ${feed.boardKey} row is missing title.`);
  }
  if (!applyUrl) {
    throw new Error(
      `GitHub feed ${feed.boardKey} row is missing an application URL.`,
    );
  }

  return {
    externalId: cleanMarkdownText(rawExternalId) || applyUrl,
    track: feed.track,
    companyLabel,
    title,
    applyUrl,
    sourceUrl,
    ...(postedAt ? { postedAt } : {}),
    locationTexts: rawLocation.trim() ? [rawLocation.trim()] : [],
    sourceData,
  };
}

function parseJsonFeed(
  feed: GitHubJobFeed,
  text: string,
  sourceUrl: string,
): RawCareerJobListing[] {
  const payload: unknown = JSON.parse(text);
  const records = findJsonRecords(payload);

  return records.map((record) => {
    const companyLabel = firstString(record, JSON_FIELD_ALIASES.company);
    const title = firstString(record, JSON_FIELD_ALIASES.title);
    const applyUrl = safeHttpUrl(
      firstString(record, JSON_FIELD_ALIASES.applyUrl),
    );
    if (!companyLabel) {
      throw new Error(
        `GitHub feed ${feed.boardKey} record is missing company.`,
      );
    }
    if (!title) {
      throw new Error(`GitHub feed ${feed.boardKey} record is missing title.`);
    }
    if (!applyUrl) {
      throw new Error(
        `GitHub feed ${feed.boardKey} record is missing an application URL.`,
      );
    }

    const postedDate = firstString(record, JSON_FIELD_ALIASES.postedDate);
    const postedAt = parsePostedAt(postedDate);
    const locationTexts = rawLocationTexts(
      firstValue(record, JSON_FIELD_ALIASES.location),
    );

    return {
      externalId:
        firstString(record, JSON_FIELD_ALIASES.externalId) || applyUrl,
      track: feed.track,
      companyLabel,
      title,
      applyUrl,
      ...(postedAt ? { postedAt } : {}),
      locationTexts,
      sourceUrl,
      sourceData: record,
    };
  });
}

function parsePostedAt(value: string): Date | undefined {
  if (
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(
      value,
    )
  ) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  if (value.length === 10 && parsed.toISOString().slice(0, 10) !== value) {
    return undefined;
  }
  return parsed;
}

function findJsonRecords(value: unknown): Record<string, unknown>[] {
  const records = findJsonRecordsWithin(value);
  if (records === undefined) {
    throw new Error("GitHub JSON feed contains no supported job records.");
  }
  return records;
}

function findJsonRecordsWithin(
  value: unknown,
): Record<string, unknown>[] | undefined {
  if (Array.isArray(value)) {
    if (!value.every(isRecord)) {
      throw new Error("GitHub JSON feed contains a non-object job record.");
    }
    return value;
  }

  if (!isRecord(value)) return undefined;

  for (const key of ["jobs", "data", "results", "positions", "internships"]) {
    const nested = value[key];
    if (Array.isArray(nested)) return findJsonRecords(nested);
    if (isRecord(nested)) {
      const records = findJsonRecordsWithin(nested);
      if (records !== undefined) return records;
    }
  }

  return undefined;
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim();
  const content = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
  const withoutTrailingPipe = content.endsWith("|")
    ? content.slice(0, -1)
    : content;
  const cells: string[] = [];
  let cell = "";
  let escaped = false;

  for (const character of withoutTrailingPipe) {
    if (character === "|" && !escaped) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
    escaped = character === "\\" && !escaped;
    if (character !== "\\") escaped = false;
  }
  cells.push(cell.trim());
  return cells;
}

function isTableSeparator(value: string): boolean {
  return /^:?-{3,}:?$/.test(value.trim());
}

function normalizeFieldName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function findHeader(
  headers: string[],
  aliases: readonly string[],
): number | undefined {
  const index = headers.findIndex((header) => aliases.includes(header));
  return index < 0 ? undefined : index;
}

function findCell(
  headers: string[],
  cells: string[],
  aliases: readonly string[],
): string {
  const index = findHeader(headers, aliases);
  return index === undefined ? "" : (cells[index] ?? "");
}

function cleanMarkdownText(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

function linkUrl(value: string): string | undefined {
  const markdownLink = /\[[^\]]*\]\((https?:\/\/[^)\s]+)[^)]*\)/i.exec(value);
  const angleLink = /<(https?:\/\/[^>]+)>/i.exec(value);
  return markdownLink?.[1] ?? angleLink?.[1];
}

function safeHttpUrl(value: string): string | undefined {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

function hasSupportedMarkdownTable(lines: string[]): boolean {
  for (let index = 0; index < lines.length - 1; index++) {
    const headers = splitTableRow(lines[index] ?? "").map(normalizeFieldName);
    const separators = splitTableRow(lines[index + 1] ?? "");
    if (
      separators.length === headers.length &&
      separators.every(isTableSeparator) &&
      findHeader(headers, COLUMN_ALIASES.company) !== undefined &&
      findHeader(headers, COLUMN_ALIASES.title) !== undefined
    ) {
      return true;
    }
  }
  return false;
}

function firstValue(
  record: Record<string, unknown>,
  aliases: readonly string[],
): unknown {
  for (const key of aliases) {
    const value = record[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function firstString(
  record: Record<string, unknown>,
  aliases: readonly string[],
): string {
  const value = firstValue(record, aliases);
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  return "";
}

function rawLocationTexts(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((location) => {
    if (typeof location === "string" && location.trim())
      return [location.trim()];
    if (isRecord(location)) return [JSON.stringify(location)];
    return [];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
