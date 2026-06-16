// TODO: use a real logger to avoid this issue
/* eslint-disable no-console, no-restricted-properties */

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import type { BucketItem } from "minio";
import { eq, ilike, or } from "drizzle-orm";
import { Client } from "minio";

import { MINIO } from "@forge/consts";

import { db } from "../src/client";
import { Permissions, Roles, User } from "../src/schemas/auth";
import { Member } from "../src/schemas/knight-hacks";

const DEFAULT_TEAM_TERMS = [
  "sponsor",
  "director",
  "executive",
  "workshop",
  "design",
] as const;

const CSV_HEADERS = [
  "team",
  "member_id",
  "user_id",
  "first_name",
  "last_name",
  "display_name",
  "current_profile_picture_url",
  "suggested_file_names",
  "local_file",
  "profile_picture_url",
] as const;

type CsvHeader = (typeof CSV_HEADERS)[number];
type CsvRow = Record<CsvHeader, string>;

interface RosterRow {
  team: string;
  memberId: string | null;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  currentProfilePictureUrl: string | null;
}

function printUsage() {
  console.log(`Usage:
  pnpm --filter=@forge/db team-profile-pictures -- --export team-profile-pictures.csv
  pnpm --filter=@forge/db team-profile-pictures -- --apply team-profile-pictures.csv

Options:
  --export <file>          Write a CSV roster for the target teams
  --apply <file>           Upload/update profile pictures from an edited CSV
  --pictures-dir <dir>     During apply, auto-match local files by suggested names
  --teams <csv>            Role-name search terms. Default: ${DEFAULT_TEAM_TERMS.join(",")}
  --dry-run                Show intended updates without writing to MinIO or DB
  --sync-auth-image        Also update auth_user.image with the final profile URL

CSV edit columns:
  local_file               Local image path to upload to MinIO
  profile_picture_url      Already-uploaded public URL to write directly
`);
}

function getCliOptions() {
  const rawArgs = process.argv.slice(2);
  const args = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;
  const { values } = parseArgs({
    args,
    options: {
      apply: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      export: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
      "pictures-dir": { type: "string" },
      "sync-auth-image": { type: "boolean", default: false },
      teams: { type: "string" },
    },
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  if (!values.export && !values.apply) {
    printUsage();
    throw new Error("Pass either --export or --apply.");
  }

  if (values.export && values.apply) {
    throw new Error("Pass only one of --export or --apply.");
  }

  const teamTerms = values.teams
    ? values.teams
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [...DEFAULT_TEAM_TERMS];

  if (teamTerms.length === 0) {
    throw new Error("At least one team search term is required.");
  }

  return {
    applyFile: values.apply,
    dryRun: values["dry-run"],
    exportFile: values.export,
    picturesDir: values["pictures-dir"],
    syncAuthImage: values["sync-auth-image"],
    teamTerms,
  };
}

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function getNameSuggestions(firstName: string | null, lastName: string | null) {
  const first = normalizeName(firstName ?? "");
  const last = normalizeName(lastName ?? "");
  const firstInitial = first.at(0) ?? "";
  const lastInitial = last.at(0) ?? "";

  return unique([
    first && last ? `${first}_${last}` : "",
    first && last ? `${first}-${last}` : "",
    first && lastInitial ? `${first}_${lastInitial}` : "",
    first && lastInitial ? `${first}${lastInitial}` : "",
    firstInitial && last ? `${firstInitial}_${last}` : "",
    firstInitial && last ? `${firstInitial}${last}` : "",
    first,
  ]);
}

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function toCsv(rows: CsvRow[]) {
  const lines = [CSV_HEADERS.join(",")];

  for (const row of rows) {
    lines.push(CSV_HEADERS.map((header) => csvEscape(row[header])).join(","));
  }

  return `${lines.join("\n")}\n`;
}

function parseCsv(content: string): CsvRow[] {
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index++) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        index++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      currentRecord.push(currentField);
      currentField = "";
    } else if (char === "\n") {
      currentRecord.push(currentField.replace(/\r$/, ""));
      records.push(currentRecord);
      currentRecord = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentField.replace(/\r$/, ""));
    records.push(currentRecord);
  }

  const [headers, ...dataRows] = records.filter((record) =>
    record.some((field) => field.trim().length > 0),
  );

  if (!headers) return [];

  for (const header of CSV_HEADERS) {
    if (!headers.includes(header)) {
      throw new Error(`CSV is missing required header: ${header}`);
    }
  }

  return dataRows.map((record) => {
    const row = Object.fromEntries(
      CSV_HEADERS.map((header) => {
        const index = headers.indexOf(header);
        return [header, record[index]?.trim() ?? ""];
      }),
    ) as CsvRow;

    return row;
  });
}

function toCsvRow(row: RosterRow): CsvRow {
  return {
    team: row.team,
    member_id: row.memberId ?? "",
    user_id: row.userId,
    first_name: row.firstName ?? "",
    last_name: row.lastName ?? "",
    display_name: row.displayName ?? "",
    current_profile_picture_url: row.currentProfilePictureUrl ?? "",
    suggested_file_names: getNameSuggestions(row.firstName, row.lastName).join(
      ";",
    ),
    local_file: "",
    profile_picture_url: "",
  };
}

async function getRosterRows(teamTerms: string[]) {
  const filters = teamTerms.map((term) => ilike(Roles.name, `%${term}%`));
  const rows = await db
    .select({
      team: Roles.name,
      memberId: Member.id,
      userId: User.id,
      firstName: Member.firstName,
      lastName: Member.lastName,
      displayName: User.name,
      currentProfilePictureUrl: Member.profilePictureUrl,
    })
    .from(Roles)
    .innerJoin(Permissions, eq(Permissions.roleId, Roles.id))
    .innerJoin(User, eq(User.id, Permissions.userId))
    .leftJoin(Member, eq(Member.userId, User.id))
    .where(or(...filters))
    .orderBy(Roles.name, Member.firstName, Member.lastName, User.name);

  return rows;
}

async function exportRoster(filePath: string, teamTerms: string[]) {
  const rosterRows = await getRosterRows(teamTerms);
  const csvRows = rosterRows.map(toCsvRow);
  await writeFile(path.resolve(filePath), toCsv(csvRows));

  const missingMemberRows = rosterRows.filter((row) => !row.memberId).length;
  console.log(
    `Wrote ${csvRows.length} row(s) to ${filePath} for role terms: ${teamTerms.join(", ")}`,
  );

  if (missingMemberRows > 0) {
    console.log(
      `${missingMemberRows} row(s) have a Blade user but no member profile, so they cannot be updated until a member row exists.`,
    );
  }
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be set to upload local files.`);
  }

  return value;
}

function getOptionalEnv(name: string) {
  return process.env[name];
}

function getContentType(filePath: string) {
  const extension = path.extname(filePath).slice(1).toLowerCase();

  switch (extension) {
    case "gif":
      return "image/gif";
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      throw new Error(
        `${filePath} must use one of these extensions: ${MINIO.ALLOWED_PROFILE_PICTURE_EXTENSIONS.join(", ")}`,
      );
  }
}

async function ensureUploadableImage(filePath: string) {
  const absolutePath = path.resolve(filePath);
  const fileStat = await stat(absolutePath);
  const contentType = getContentType(absolutePath);

  if (fileStat.size === 0) {
    throw new Error(`${filePath} is empty.`);
  }

  if (fileStat.size > MINIO.KNIGHTHACKS_MAX_PROFILE_PICTURE_SIZE) {
    throw new Error(
      `${filePath} is ${fileStat.size} bytes; max is ${MINIO.KNIGHTHACKS_MAX_PROFILE_PICTURE_SIZE} bytes.`,
    );
  }

  return { absolutePath, contentType };
}

function getConfiguredMinioHost() {
  const endpoint = getOptionalEnv("MINIO_ENDPOINT")?.trim();

  if (!endpoint) return null;

  try {
    return new URL(endpoint.includes("://") ? endpoint : `https://${endpoint}`)
      .host;
  } catch {
    throw new Error("MINIO_ENDPOINT must be a valid host.");
  }
}

function normalizeProfilePictureUrl(rawUrl: string, displayName: string) {
  const trimmedUrl = rawUrl.trim();

  if (trimmedUrl.length === 0) return "";

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    throw new Error(
      `profile_picture_url for ${displayName} must be a valid absolute URL.`,
    );
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error(`profile_picture_url for ${displayName} must use HTTPS.`);
  }

  const extension = path.extname(parsedUrl.pathname).slice(1).toLowerCase();

  if (!MINIO.ALLOWED_PROFILE_PICTURE_EXTENSIONS.includes(extension)) {
    throw new Error(
      `profile_picture_url for ${displayName} must end with one of these extensions: ${MINIO.ALLOWED_PROFILE_PICTURE_EXTENSIONS.join(", ")}`,
    );
  }

  const configuredMinioHost = getConfiguredMinioHost();

  if (configuredMinioHost) {
    if (parsedUrl.host !== configuredMinioHost) {
      throw new Error(
        `profile_picture_url for ${displayName} must use ${configuredMinioHost}.`,
      );
    }

    if (
      !parsedUrl.pathname.startsWith(
        `/${MINIO.PROFILE_PICTURES_BUCKET_NAME}/`,
      )
    ) {
      throw new Error(
        `profile_picture_url for ${displayName} must point at the ${MINIO.PROFILE_PICTURES_BUCKET_NAME} bucket.`,
      );
    }
  }

  return parsedUrl.toString();
}

function createMinioClient() {
  return new Client({
    endPoint: getRequiredEnv("MINIO_ENDPOINT"),
    port: 443,
    useSSL: true,
    accessKey: getRequiredEnv("MINIO_ACCESS_KEY"),
    secretKey: getRequiredEnv("MINIO_SECRET_KEY"),
  });
}

async function ensureProfilePicturesBucket(minioClient: Client) {
  const bucketExists = await minioClient.bucketExists(
    MINIO.PROFILE_PICTURES_BUCKET_NAME,
  );

  if (!bucketExists) {
    await minioClient.makeBucket(
      MINIO.PROFILE_PICTURES_BUCKET_NAME,
      MINIO.BUCKET_REGION,
    );
  }
}

async function removeExistingProfilePictures(
  minioClient: Client,
  userId: string,
  keepObjectName?: string,
) {
  const userDirectory = `${userId}/`;
  const existingObjects: string[] = [];
  const stream = minioClient.listObjects(
    MINIO.PROFILE_PICTURES_BUCKET_NAME,
    userDirectory,
    true,
  ) as AsyncIterable<BucketItem>;

  for await (const obj of stream) {
    if (obj.name && obj.name !== keepObjectName) {
      existingObjects.push(obj.name);
    }
  }

  if (existingObjects.length > 0) {
    await minioClient.removeObjects(
      MINIO.PROFILE_PICTURES_BUCKET_NAME,
      existingObjects,
    );
  }
}

async function uploadProfilePicture(
  minioClient: Client,
  userId: string,
  filePath: string,
) {
  const { absolutePath, contentType } = await ensureUploadableImage(filePath);
  const fileBuffer = await readFile(absolutePath);
  const safeFileName = path
    .basename(absolutePath)
    .replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const objectName = `${userId}/${Date.now()}-${safeFileName}`;

  await ensureProfilePicturesBucket(minioClient);
  await minioClient.putObject(
    MINIO.PROFILE_PICTURES_BUCKET_NAME,
    objectName,
    fileBuffer,
    fileBuffer.length,
    { "Content-Type": contentType },
  );

  return {
    objectName,
    profilePictureUrl: `https://${getRequiredEnv("MINIO_ENDPOINT")}/${MINIO.PROFILE_PICTURES_BUCKET_NAME}/${objectName}`,
  };
}

async function buildPictureDirectoryIndex(directory: string | undefined) {
  if (!directory) return new Map<string, string[]>();

  const absoluteDirectory = path.resolve(directory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const index = new Map<string, string[]>();

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const extension = path.extname(entry.name).slice(1).toLowerCase();
    if (!MINIO.ALLOWED_PROFILE_PICTURE_EXTENSIONS.includes(extension)) {
      continue;
    }

    const stem = normalizeName(
      path.basename(entry.name, path.extname(entry.name)),
    );
    const matches = index.get(stem) ?? [];
    matches.push(path.join(absoluteDirectory, entry.name));
    index.set(stem, matches);
  }

  return index;
}

function findPictureInDirectory(
  row: CsvRow,
  pictureDirectoryIndex: Map<string, string[]>,
) {
  if (pictureDirectoryIndex.size === 0) return null;

  const suggestions = unique([
    ...row.suggested_file_names.split(";").map((value) => normalizeName(value)),
    ...getNameSuggestions(row.first_name, row.last_name),
  ]);

  const matches = unique(
    suggestions.flatMap(
      (suggestion) => pictureDirectoryIndex.get(suggestion) ?? [],
    ),
  );

  if (matches.length > 1) {
    throw new Error(
      `Multiple picture files matched ${row.first_name} ${row.last_name}: ${matches.join(", ")}`,
    );
  }

  return matches[0] ?? null;
}

async function applyProfilePictures({
  csvFile,
  dryRun,
  picturesDir,
  syncAuthImage,
}: {
  csvFile: string;
  dryRun: boolean;
  picturesDir: string | undefined;
  syncAuthImage: boolean;
}) {
  const csvRows = parseCsv(await readFile(path.resolve(csvFile), "utf8"));
  const pictureDirectoryIndex = await buildPictureDirectoryIndex(picturesDir);
  const updates = new Map<
    string,
    {
      displayName: string;
      localFile: string;
      profilePictureUrl: string;
      userId: string;
    }
  >();

  for (const row of csvRows) {
    if (!row.member_id) continue;

    const matchedLocalFile = findPictureInDirectory(row, pictureDirectoryIndex);
    const inferredLocalFile =
      row.local_file.trim().length > 0
        ? row.local_file
        : (matchedLocalFile ?? "");
    const hasLocalFile = inferredLocalFile.trim().length > 0;
    const hasUrl = row.profile_picture_url.trim().length > 0;

    if (!hasLocalFile && !hasUrl) continue;

    if (hasLocalFile && hasUrl) {
      throw new Error(
        `Set only one of local_file or profile_picture_url for ${row.first_name} ${row.last_name}.`,
      );
    }

    const fullName = [row.first_name, row.last_name].filter(Boolean).join(" ");
    const displayName =
      fullName.length > 0
        ? fullName
        : row.display_name.length > 0
          ? row.display_name
          : row.user_id;
    const profilePictureUrl = normalizeProfilePictureUrl(
      row.profile_picture_url,
      displayName,
    );

    const update = {
      displayName,
      localFile: inferredLocalFile,
      profilePictureUrl,
      userId: row.user_id,
    };
    const existingUpdate = updates.get(row.member_id);

    if (
      existingUpdate &&
      (existingUpdate.localFile !== update.localFile ||
        existingUpdate.profilePictureUrl !== update.profilePictureUrl)
    ) {
      throw new Error(
        `Conflicting updates found for ${update.displayName} (${row.member_id}).`,
      );
    }

    updates.set(row.member_id, update);
  }

  if (updates.size === 0) {
    console.log("No rows had local_file or profile_picture_url set.");
    return;
  }

  const minioClient =
    [...updates.values()].some(
      (update) => update.localFile.trim().length > 0,
    ) && !dryRun
      ? createMinioClient()
      : null;

  let updatedCount = 0;

  for (const [memberId, update] of updates) {
    let finalProfilePictureUrl = update.profilePictureUrl;
    let uploadedObjectName: string | undefined;

    if (update.localFile) {
      if (dryRun) {
        finalProfilePictureUrl = `[would upload] ${path.resolve(update.localFile)}`;
      } else {
        if (!minioClient) {
          throw new Error("MinIO client was not initialized.");
        }

        const upload = await uploadProfilePicture(
          minioClient,
          update.userId,
          update.localFile,
        );
        finalProfilePictureUrl = upload.profilePictureUrl;
        uploadedObjectName = upload.objectName;
      }
    }

    console.log(
      `${dryRun ? "Would update" : "Updating"} ${update.displayName}: ${finalProfilePictureUrl}`,
    );

    if (!dryRun) {
      await db
        .update(Member)
        .set({ profilePictureUrl: finalProfilePictureUrl })
        .where(eq(Member.id, memberId));

      if (syncAuthImage) {
        await db
          .update(User)
          .set({ image: finalProfilePictureUrl })
          .where(eq(User.id, update.userId));
      }

      if (minioClient && uploadedObjectName) {
        await removeExistingProfilePictures(
          minioClient,
          update.userId,
          uploadedObjectName,
        );
      }
    }

    updatedCount++;
  }

  console.log(
    `${dryRun ? "Validated" : "Updated"} ${updatedCount} profile picture row(s).`,
  );
}

async function main() {
  const options = getCliOptions();

  if (options.exportFile) {
    await exportRoster(options.exportFile, options.teamTerms);
  } else if (options.applyFile) {
    await applyProfilePictures({
      csvFile: options.applyFile,
      dryRun: options.dryRun,
      picturesDir: options.picturesDir,
      syncAuthImage: options.syncAuthImage,
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
