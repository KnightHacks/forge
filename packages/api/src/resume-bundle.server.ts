import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { lstat, mkdtemp, open, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { finished } from "node:stream/promises";
import type { Dirent } from "node:fs";
import { TRPCError } from "@trpc/server";
import archiver from "archiver";

import type { Session } from "@forge/auth/server";
import { MINIO } from "@forge/consts";
import { and, asc, eq, isNotNull } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hackathon,
  Hacker,
  HackerAttendee,
  Member,
} from "@forge/db/schemas/knight-hacks";
import { logger } from "@forge/utils";

import { requireHackathonResumeBundlePrepare } from "./utils/analytics/access";
import { inferAcademicYear } from "./utils/analytics/demographics";
import { createAdminAuditEvent } from "./utils/audit/service";
import { loadPermissionsForUser } from "./utils/permissions-db";
import {
  createResumeBundleParts,
  createResumeBundlePlan,
  sortResumeBundleCandidates,
} from "./utils/resume/bundle";
import {
  isResumeObjectOwnedByUser,
  RESUME_BUCKET_NAME,
} from "./utils/resume/security";
import { resumeStorageClient } from "./utils/resume/storage";

const PDF_MAGIC = "%PDF-";
const ZIP_MAGIC = "PK";
const STAGING_DIRECTORY_PREFIX = "forge-resume-bundle-";
const STALE_STAGING_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const STALE_STAGING_DELETE_LIMIT = 32;
const RECRUITER_ROOTS = [
  "00 All resumes/",
  "01 Recruiting horizon/",
  "02 Graduation term/",
  "03 Inferred academic year/",
  "04 Level of study/",
  "05 Major/",
  "06 University/",
  "07 Demographics/Age band/",
  "07 Demographics/Gender/",
  "07 Demographics/Race or ethnicity/",
] as const;

async function cleanupStaleResumeStages(referenceDate = new Date()) {
  let entries: Dirent[];
  try {
    entries = await readdir(tmpdir(), { withFileTypes: true });
  } catch {
    logger.warn("Resume bundle stale-stage discovery failed.");
    return;
  }
  const candidates = entries
    .filter(
      (entry) =>
        entry.isDirectory() && entry.name.startsWith(STAGING_DIRECTORY_PREFIX),
    )
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, STALE_STAGING_DELETE_LIMIT);
  await Promise.all(
    candidates.map(async (entry) => {
      const path = join(tmpdir(), entry.name);
      try {
        const metadata = await lstat(path);
        if (
          referenceDate.getTime() - metadata.mtime.getTime() >=
          STALE_STAGING_MAX_AGE_MS
        ) {
          await rm(path, { force: true, recursive: true });
        }
      } catch {
        logger.warn("Resume bundle stale-stage cleanup skipped one entry.");
      }
    }),
  );
}

function buildResumeReadme({
  availableCount,
  generatedAt,
  matchingCount,
  partCount,
  partNumber,
  pool,
  scope,
  selectedCount,
  skippedCount,
}: {
  availableCount: number;
  generatedAt: string;
  matchingCount: number;
  partCount: number;
  partNumber: number;
  pool?: string;
  scope: string;
  selectedCount: number;
  skippedCount: number;
}) {
  return [
    "Knight Hacks recruiter resume bundle",
    `Scope: ${scope}`,
    ...(pool ? [`Candidate pool: ${pool}`] : []),
    `Generated: ${generatedAt}`,
    `Matching profiles with resume references: ${matchingCount}`,
    `Validated available resumes: ${availableCount}`,
    `Included in this part: ${selectedCount}`,
    `Skipped resumes: ${skippedCount}`,
    `Part: ${partNumber} of ${partCount}`,
    "",
    "Derivations",
    "- Recruiting horizon compares graduation date with the archive-generation calendar date in America/New_York, using inclusive 12- and 24-calendar-month boundaries.",
    "- Graduation term and year come from the stored graduation date; missing and invalid values remain explicit.",
    "- Inferred academic year uses the documented August 1 America/New_York boundary and keeps two-year and three-plus-year programs separate.",
    "- Age band is derived from date of birth at the applicable report reference date; exact dates of birth are not included.",
    "",
    "Folder index",
    ...RECRUITER_ROOTS.map((root) => `- ${root}`),
    "",
    "Sensitive candidate material. Use only for authorized recruiting and delete when no longer needed.",
  ].join("\n");
}

function resumeAuditSubject(hackathonId?: string) {
  return [
    {
      relation: "primary" as const,
      targetId: hackathonId ?? "resume_bundle",
      targetLabel: hackathonId
        ? "Hackathon recruiter resume bundle"
        : "Member resume bundle",
      targetType: "analytics_report" as const,
    },
  ];
}

async function readResumeObject(objectName: string) {
  const objectStream = await resumeStorageClient.getObject(
    RESUME_BUCKET_NAME,
    objectName,
  );
  const chunks: Buffer[] = [];
  let byteLength = 0;

  for await (const chunk of objectStream) {
    const buffer = Buffer.from(chunk as Uint8Array);
    byteLength += buffer.length;
    if (byteLength > MINIO.MAX_RESUME_SIZE) {
      objectStream.destroy();
      throw new Error("A stored resume exceeds the configured size limit.");
    }
    chunks.push(buffer);
  }

  const content = Buffer.concat(chunks);
  if (
    content.length === 0 ||
    content.subarray(0, PDF_MAGIC.length).toString("ascii") !== PDF_MAGIC
  ) {
    throw new Error("A stored resume is not a valid PDF.");
  }
  return content;
}

async function storedObjectStartsWithPdfMagic(objectName: string) {
  const objectStream = await resumeStorageClient.getPartialObject(
    RESUME_BUCKET_NAME,
    objectName,
    0,
    PDF_MAGIC.length,
  );
  const chunks: Buffer[] = [];
  for await (const chunk of objectStream) {
    chunks.push(Buffer.from(chunk as Uint8Array));
  }
  return (
    Buffer.concat(chunks).subarray(0, PDF_MAGIC.length).toString("ascii") ===
    PDF_MAGIC
  );
}

function appendResumeCopies({
  archive,
  content,
  paths,
}: {
  archive: ReturnType<typeof archiver>;
  content: Buffer;
  paths: readonly string[];
}) {
  return new Promise<void>((resolve, reject) => {
    const pendingPaths = new Set(paths);
    const cleanup = () => {
      archive.off("entry", handleEntry);
      archive.off("error", handleError);
      archive.off("warning", handleError);
    };
    const handleEntry = (entry: { name: string }) => {
      if (!pendingPaths.delete(entry.name) || pendingPaths.size > 0) return;
      cleanup();
      resolve();
    };
    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };

    archive.on("entry", handleEntry);
    archive.on("error", handleError);
    archive.on("warning", handleError);
    paths.forEach((path) => archive.append(content, { name: path }));
  });
}

async function stageResumeArchive({
  available,
  plan,
  readme,
}: {
  available: readonly { resumeUrl: string }[];
  plan: readonly { paths: readonly string[] }[];
  readme: string;
}) {
  await cleanupStaleResumeStages();
  const directory = await mkdtemp(join(tmpdir(), STAGING_DIRECTORY_PREFIX));
  const archivePath = join(directory, "bundle.zip");
  const archive = archiver("zip", { store: true });
  const destination = createWriteStream(archivePath, { flags: "wx" });
  const destinationFinished = finished(destination);
  void destinationFinished.catch(() => undefined);
  archive.pipe(destination);
  try {
    RECRUITER_ROOTS.forEach((root) => archive.append("", { name: root }));
    archive.append(readme, { name: "README.txt" });
    for (const [index, row] of available.entries()) {
      await appendResumeCopies({
        archive,
        content: await readResumeObject(row.resumeUrl),
        paths: plan[index]?.paths ?? [],
      });
    }
    await archive.finalize();
    await destinationFinished;
    const archiveStat = await stat(archivePath);
    const handle = await open(archivePath, "r");
    const signature = Buffer.alloc(ZIP_MAGIC.length);
    await handle.read(signature, 0, signature.length, 0);
    await handle.close();
    if (
      archiveStat.size <= ZIP_MAGIC.length ||
      signature.toString("ascii") !== ZIP_MAGIC
    ) {
      throw new Error("The staged resume archive failed ZIP verification.");
    }
    const stream = createReadStream(archivePath);
    const cleanup = () => void rm(directory, { force: true, recursive: true });
    stream.once("close", cleanup);
    stream.once("error", cleanup);
    return { byteLength: archiveStat.size, stream };
  } catch (error) {
    archive.abort();
    destination.destroy();
    await rm(directory, { force: true, recursive: true });
    throw error;
  }
}

async function validateResumeRows<
  T extends { resumeUrl: string; userId: string },
>(rows: readonly T[]) {
  const owned = rows.filter((row) =>
    isResumeObjectOwnedByUser(row.resumeUrl, row.userId),
  );
  const available: (T & { sourceBytes: number })[] = [];
  for (let index = 0; index < owned.length; index += 12) {
    const batch = await Promise.all(
      owned
        .slice(index, index + 12)
        .map(async (row): Promise<(T & { sourceBytes: number }) | null> => {
          try {
            const objectStat = await resumeStorageClient.statObject(
              RESUME_BUCKET_NAME,
              row.resumeUrl,
            );
            if (
              objectStat.size <= 0 ||
              objectStat.size > MINIO.MAX_RESUME_SIZE ||
              !Number.isSafeInteger(objectStat.size)
            ) {
              return null;
            }
            return (await storedObjectStartsWithPdfMagic(row.resumeUrl))
              ? { ...row, sourceBytes: objectStat.size }
              : null;
          } catch {
            return null;
          }
        }),
    );
    for (const row of batch) {
      if (row !== null) available.push(row as T & { sourceBytes: number });
    }
  }
  return {
    available,
    invalidReferenceCount: rows.length - owned.length,
    unavailableCount: owned.length - available.length,
  };
}

function buildPreparedPlan<
  T extends { resumeUrl: string; sourceBytes: number },
>(available: readonly T[], plan: ReturnType<typeof createResumeBundlePlan>) {
  const parts = createResumeBundleParts(
    plan,
    available.map((row) => row.sourceBytes),
  );
  const planFingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        parts,
        rows: available.map((row, index) => ({
          paths: plan[index]?.paths ?? [],
          resumeUrl: row.resumeUrl,
          sourceBytes: row.sourceBytes,
        })),
      }),
    )
    .digest("hex");
  return { parts, planFingerprint };
}

function selectPlanPart<T>(values: readonly T[], indexes: readonly number[]) {
  return indexes.map((index) => {
    const value = values[index];
    if (value === undefined) {
      throw new Error("The resume bundle plan references an invalid row.");
    }
    return value;
  });
}

function aggregateResumePreview({
  matchingCount,
  parts,
  planFingerprint,
  skippedCount,
  validCount,
}: {
  matchingCount: number;
  parts: ReturnType<typeof createResumeBundleParts>;
  planFingerprint: string;
  skippedCount: number;
  validCount: number;
}) {
  return {
    matchingCount,
    partCount: parts.length,
    parts: parts.map((part) => ({
      expandedBytes: part.expandedBytes,
      partNumber: part.partNumber,
      sourceBytes: part.sourceBytes,
      sourceCount: part.sourceCount,
    })),
    planFingerprint,
    skippedCount,
    validCount,
  };
}

async function requireResumePolicy(
  actor: Session["user"],
  policyAcknowledged: boolean,
  policyVersion: string,
) {
  requireHackathonResumeBundlePrepare({
    session: { permissions: await loadPermissionsForUser(actor.id) },
  });
  if (!policyAcknowledged || policyVersion !== "resume-sensitive-index-v1") {
    throw new Error(
      "The current sensitive resume policy must be acknowledged.",
    );
  }
}

/** Aggregate-only on-demand preview; never returns names or object keys. */
export async function previewMemberResumeBundle({
  actor,
  policyAcknowledged,
  policyVersion,
}: {
  actor: Session["user"];
  policyAcknowledged: boolean;
  policyVersion: string;
}) {
  await requireResumePolicy(actor, policyAcknowledged, policyVersion);
  const rows = await db
    .select({
      dob: Member.dob,
      firstName: Member.firstName,
      gender: Member.gender,
      gradDate: Member.gradDate,
      id: Member.id,
      lastName: Member.lastName,
      levelOfStudy: Member.levelOfStudy,
      major: Member.major,
      raceOrEthnicity: Member.raceOrEthnicity,
      resumeUrl: Member.resumeUrl,
      school: Member.school,
      userId: Member.userId,
    })
    .from(Member)
    .where(isNotNull(Member.resumeUrl))
    .orderBy(asc(Member.lastName), asc(Member.firstName), asc(Member.id));
  const candidates = sortResumeBundleCandidates(
    rows.flatMap((row) => {
      const resumeUrl = row.resumeUrl?.trim();
      return resumeUrl ? [{ ...row, resumeUrl }] : [];
    }),
  );
  const { available, invalidReferenceCount, unavailableCount } =
    await validateResumeRows(candidates);
  const generatedAt = new Date();
  const plan = createResumeBundlePlan(
    available.map((row) => ({
      ...row,
      inferredYearOfStudy: inferAcademicYear(
        row.gradDate,
        row.levelOfStudy,
        generatedAt,
      ),
    })),
    generatedAt,
  );
  const prepared = buildPreparedPlan(available, plan);
  return aggregateResumePreview({
    matchingCount: candidates.length,
    parts: prepared.parts,
    planFingerprint: prepared.planFingerprint,
    skippedCount: invalidReferenceCount + unavailableCount,
    validCount: available.length,
  });
}

export async function createMemberResumeBundle({
  actor,
  partNumber,
  planFingerprint: requestedPlanFingerprint,
  policyAcknowledged,
  policyVersion,
}: {
  actor: Session["user"];
  partNumber: number;
  planFingerprint: string;
  policyAcknowledged: boolean;
  policyVersion: string;
}) {
  requireHackathonResumeBundlePrepare({
    session: { permissions: await loadPermissionsForUser(actor.id) },
  });
  if (!policyAcknowledged || policyVersion !== "resume-sensitive-index-v1") {
    throw new Error(
      "The current sensitive resume policy must be acknowledged.",
    );
  }

  const resumeRows = await db
    .select({
      firstName: Member.firstName,
      dob: Member.dob,
      gender: Member.gender,
      gradDate: Member.gradDate,
      id: Member.id,
      lastName: Member.lastName,
      major: Member.major,
      levelOfStudy: Member.levelOfStudy,
      raceOrEthnicity: Member.raceOrEthnicity,
      resumeUrl: Member.resumeUrl,
      school: Member.school,
      userId: Member.userId,
    })
    .from(Member)
    .where(isNotNull(Member.resumeUrl))
    .orderBy(
      asc(Member.lastName),
      asc(Member.firstName),
      asc(Member.gradDate),
      asc(Member.id),
    );
  const members = sortResumeBundleCandidates(
    resumeRows.flatMap((member) => {
      const resumeUrl = member.resumeUrl?.trim();
      return resumeUrl ? [{ ...member, resumeUrl }] : [];
    }),
  );
  await createAdminAuditEvent({
    actionKey: "analytics.report.exported",
    actor,
    metadata: {
      dateFrom: null,
      dateTo: null,
      eventIds: [],
      kind: "resume_bundle",
      phase: "attempted",
      policyAcknowledged,
      policyVersion,
      rowCount: members.length,
    },
    subjects: resumeAuditSubject(),
  });
  const {
    available: availableMembers,
    invalidReferenceCount,
    unavailableCount,
  } = await validateResumeRows(members);
  if (invalidReferenceCount > 0) {
    logger.warn(
      `Member resume bundle skipped ${invalidReferenceCount} invalid stored resume references.`,
    );
  }
  if (unavailableCount > 0) {
    logger.warn(
      `Member resume bundle skipped ${unavailableCount} unavailable or invalid stored resume objects.`,
    );
  }
  const referenceDate = new Date();
  const plan = createResumeBundlePlan(
    availableMembers.map((member) => ({
      ...member,
      inferredYearOfStudy: inferAcademicYear(
        member.gradDate,
        member.levelOfStudy,
        referenceDate,
      ),
    })),
    referenceDate,
  );

  const generatedAt = referenceDate.toISOString();
  const { parts, planFingerprint } = buildPreparedPlan(availableMembers, plan);
  if (availableMembers.length === 0) {
    await createAdminAuditEvent({
      actionKey: "analytics.report.exported",
      actor,
      metadata: {
        dateFrom: null,
        dateTo: null,
        eventIds: [],
        failureFamily: "no_valid_resumes",
        kind: "resume_bundle",
        phase: "failed",
        policyAcknowledged,
        policyVersion,
        rowCount: 0,
      },
      subjects: resumeAuditSubject(),
    });
    throw new Error("No valid resumes are available for this bundle.");
  }
  const auditMetadata = {
    byteLength: null,
    dateFrom: null,
    dateTo: null,
    eventIds: [],
    failureFamily: null,
    generatedAt,
    includedIndexKeys: [...RECRUITER_ROOTS],
    kind: "resume_bundle",
    partCount: parts.length,
    partNumber,
    phase: "attempted",
    planFingerprint,
    policyAcknowledged,
    policyVersion,
    rowCount: availableMembers.length,
    skippedCount: invalidReferenceCount + unavailableCount,
  };
  const selectedPart = parts[partNumber - 1];
  if (!selectedPart || requestedPlanFingerprint !== planFingerprint) {
    await createAdminAuditEvent({
      actionKey: "analytics.report.exported",
      actor,
      metadata: {
        ...auditMetadata,
        failureFamily: "stale_or_invalid_part",
        phase: "failed",
      },
      subjects: resumeAuditSubject(),
    });
    throw new Error("The resume bundle plan is stale or the part is invalid.");
  }
  const selectedAvailable = selectPlanPart(
    availableMembers,
    selectedPart.indexes,
  );
  const selectedPlan = selectPlanPart(plan, selectedPart.indexes);
  try {
    const staged = await stageResumeArchive({
      available: selectedAvailable,
      plan: selectedPlan,
      readme: buildResumeReadme({
        availableCount: availableMembers.length,
        generatedAt,
        matchingCount: members.length,
        partCount: parts.length,
        partNumber,
        scope: "Club members",
        selectedCount: selectedAvailable.length,
        skippedCount: invalidReferenceCount + unavailableCount,
      }),
    });
    try {
      await createAdminAuditEvent({
        actionKey: "analytics.report.exported",
        actor,
        metadata: {
          ...auditMetadata,
          byteLength: staged.byteLength,
          phase: "completed",
        },
        subjects: resumeAuditSubject(),
      });
    } catch (error) {
      staged.stream.destroy();
      throw error;
    }
    return {
      fileName: `member-resume-bundle-${generatedAt.slice(0, 10)}-part-${partNumber}-of-${parts.length}.zip`,
      partCount: parts.length,
      partNumber,
      planFingerprint,
      resumeCount: selectedAvailable.length,
      skippedCount: invalidReferenceCount + unavailableCount,
      stream: staged.stream,
    };
  } catch (error) {
    await createAdminAuditEvent({
      actionKey: "analytics.report.exported",
      actor,
      metadata: {
        ...auditMetadata,
        failureFamily:
          availableMembers.length === 0 ? "no_valid_resumes" : "archive_build",
        phase: "failed",
      },
      subjects: resumeAuditSubject(),
    });
    throw error;
  }
}

type HackathonResumePool =
  | "current_confirmed"
  | "on_site"
  | "current_selected"
  | "custom_current_statuses";

async function requireHackathonExists(hackathonId: string) {
  const [hackathon] = await db
    .select({ id: Hackathon.id })
    .from(Hackathon)
    .where(eq(Hackathon.id, hackathonId))
    .limit(1);
  if (!hackathon) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Hackathon not found.",
    });
  }
}

/** Aggregate-only recruiter preview for one explicitly scoped hackathon. */
export async function previewHackathonResumeBundle({
  actor,
  currentStatuses,
  hackathonId,
  policyAcknowledged,
  policyVersion,
  pool,
}: {
  actor: Session["user"];
  currentStatuses: string[];
  hackathonId: string;
  policyAcknowledged: boolean;
  policyVersion: string;
  pool: HackathonResumePool;
}) {
  await requireResumePolicy(actor, policyAcknowledged, policyVersion);
  await requireHackathonExists(hackathonId);
  const rows = await db
    .select({
      checkedInAt: HackerAttendee.checkedInAt,
      dob: Hacker.dob,
      firstName: Hacker.firstName,
      gender: Hacker.gender,
      gradDate: Hacker.gradDate,
      hackathonStartDate: Hackathon.startDate,
      id: HackerAttendee.id,
      lastName: Hacker.lastName,
      levelOfStudy: Hacker.levelOfStudy,
      major: Hacker.major,
      profileId: Hacker.id,
      raceOrEthnicity: Hacker.raceOrEthnicity,
      resumeUrl: Hacker.resumeUrl,
      school: Hacker.school,
      status: HackerAttendee.status,
      userId: Hacker.userId,
    })
    .from(HackerAttendee)
    .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
    .innerJoin(Hackathon, eq(Hackathon.id, HackerAttendee.hackathonId))
    .where(
      and(
        eq(HackerAttendee.hackathonId, hackathonId),
        isNotNull(Hacker.resumeUrl),
      ),
    )
    .orderBy(
      asc(Hacker.lastName),
      asc(Hacker.firstName),
      asc(HackerAttendee.id),
    );
  const eligibleStatuses =
    pool === "current_confirmed"
      ? new Set(["confirmed", "checkedin"])
      : pool === "current_selected"
        ? new Set(["accepted", "confirmed", "checkedin"])
        : pool === "custom_current_statuses"
          ? new Set(currentStatuses)
          : null;
  const candidates = sortResumeBundleCandidates(
    rows.flatMap((row) => {
      const eligible =
        pool === "on_site"
          ? row.checkedInAt !== null || row.status === "checkedin"
          : eligibleStatuses?.has(row.status) === true;
      const resumeUrl = row.resumeUrl?.trim();
      return eligible && resumeUrl ? [{ ...row, resumeUrl }] : [];
    }),
  );
  const { available } = await validateResumeRows(candidates);
  const generatedAt = new Date();
  const plan = createResumeBundlePlan(
    available.map((row) => ({
      ...row,
      inferredYearOfStudy: inferAcademicYear(
        row.gradDate,
        row.levelOfStudy,
        row.hackathonStartDate,
      ),
    })),
    generatedAt,
  );
  const prepared = buildPreparedPlan(available, plan);
  return aggregateResumePreview({
    matchingCount: candidates.length,
    parts: prepared.parts,
    planFingerprint: prepared.planFingerprint,
    skippedCount: candidates.length - available.length,
    validCount: available.length,
  });
}

/** Builds the officer-only recruiter archive for one explicitly scoped hack. */
export async function createHackathonResumeBundle({
  actor,
  currentStatuses,
  hackathonId,
  partNumber,
  planFingerprint: requestedPlanFingerprint,
  policyAcknowledged,
  policyVersion,
  pool,
}: {
  actor: Session["user"];
  currentStatuses: string[];
  hackathonId: string;
  partNumber: number;
  planFingerprint: string;
  policyAcknowledged: boolean;
  policyVersion: string;
  pool: HackathonResumePool;
}) {
  requireHackathonResumeBundlePrepare({
    session: { permissions: await loadPermissionsForUser(actor.id) },
  });
  if (!policyAcknowledged || policyVersion !== "resume-sensitive-index-v1") {
    throw new Error(
      "The current sensitive resume policy must be acknowledged.",
    );
  }
  await requireHackathonExists(hackathonId);

  const rows = await db
    .select({
      checkedInAt: HackerAttendee.checkedInAt,
      dob: Hacker.dob,
      firstName: Hacker.firstName,
      gender: Hacker.gender,
      gradDate: Hacker.gradDate,
      hackathonStartDate: Hackathon.startDate,
      id: HackerAttendee.id,
      lastName: Hacker.lastName,
      levelOfStudy: Hacker.levelOfStudy,
      major: Hacker.major,
      profileId: Hacker.id,
      raceOrEthnicity: Hacker.raceOrEthnicity,
      resumeUrl: Hacker.resumeUrl,
      school: Hacker.school,
      status: HackerAttendee.status,
      userId: Hacker.userId,
    })
    .from(HackerAttendee)
    .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
    .innerJoin(Hackathon, eq(Hackathon.id, HackerAttendee.hackathonId))
    .where(
      and(
        eq(HackerAttendee.hackathonId, hackathonId),
        isNotNull(Hacker.resumeUrl),
      ),
    )
    .orderBy(
      asc(Hacker.lastName),
      asc(Hacker.firstName),
      asc(Hacker.gradDate),
      asc(HackerAttendee.id),
    );
  const eligibleStatuses =
    pool === "current_confirmed"
      ? new Set(["confirmed", "checkedin"])
      : pool === "current_selected"
        ? new Set(["accepted", "confirmed", "checkedin"])
        : pool === "custom_current_statuses"
          ? new Set(currentStatuses)
          : null;
  const candidates = sortResumeBundleCandidates(
    rows.flatMap((row) => {
      const eligible =
        pool === "on_site"
          ? row.checkedInAt !== null || row.status === "checkedin"
          : eligibleStatuses?.has(row.status) === true;
      const resumeUrl = row.resumeUrl?.trim();
      return eligible && resumeUrl ? [{ ...row, resumeUrl }] : [];
    }),
  );
  await createAdminAuditEvent({
    actionKey: "analytics.report.exported",
    actor,
    metadata: {
      dateFrom: null,
      dateTo: null,
      eventIds: [],
      hackathonId,
      kind: "hackathon_resume_bundle",
      phase: "attempted",
      policyAcknowledged,
      policyVersion,
      pool,
      rowCount: candidates.length,
    },
    subjects: resumeAuditSubject(hackathonId),
  });
  const { available } = await validateResumeRows(candidates);
  const generatedAtDate = new Date();
  const plan = createResumeBundlePlan(
    available.map((row) => ({
      ...row,
      inferredYearOfStudy: inferAcademicYear(
        row.gradDate,
        row.levelOfStudy,
        row.hackathonStartDate,
      ),
    })),
    generatedAtDate,
  );

  const generatedAt = generatedAtDate.toISOString();
  const skippedCount = candidates.length - available.length;
  const { parts, planFingerprint } = buildPreparedPlan(available, plan);
  if (available.length === 0) {
    await createAdminAuditEvent({
      actionKey: "analytics.report.exported",
      actor,
      metadata: {
        dateFrom: null,
        dateTo: null,
        eventIds: [],
        failureFamily: "no_valid_resumes",
        hackathonId,
        kind: "hackathon_resume_bundle",
        phase: "failed",
        policyAcknowledged,
        policyVersion,
        pool,
        rowCount: 0,
      },
      subjects: resumeAuditSubject(hackathonId),
    });
    throw new Error("No valid resumes are available for this candidate pool.");
  }
  const auditMetadata = {
    byteLength: null,
    dateFrom: null,
    dateTo: null,
    eventIds: [],
    failureFamily: null,
    generatedAt,
    hackathonId,
    includedIndexKeys: [...RECRUITER_ROOTS],
    kind: "hackathon_resume_bundle",
    partCount: parts.length,
    partNumber,
    phase: "attempted",
    planFingerprint,
    policyAcknowledged,
    policyVersion,
    pool,
    rowCount: available.length,
    skippedCount,
  };
  const selectedPart = parts[partNumber - 1];
  if (!selectedPart || requestedPlanFingerprint !== planFingerprint) {
    await createAdminAuditEvent({
      actionKey: "analytics.report.exported",
      actor,
      metadata: {
        ...auditMetadata,
        failureFamily: "stale_or_invalid_part",
        phase: "failed",
      },
      subjects: resumeAuditSubject(hackathonId),
    });
    throw new Error("The resume bundle plan is stale or the part is invalid.");
  }
  const selectedAvailable = selectPlanPart(available, selectedPart.indexes);
  const selectedPlan = selectPlanPart(plan, selectedPart.indexes);
  try {
    const staged = await stageResumeArchive({
      available: selectedAvailable,
      plan: selectedPlan,
      readme: buildResumeReadme({
        availableCount: available.length,
        generatedAt,
        matchingCount: candidates.length,
        partCount: parts.length,
        partNumber,
        pool,
        scope: `Hackathon ${hackathonId}`,
        selectedCount: selectedAvailable.length,
        skippedCount,
      }),
    });
    try {
      await createAdminAuditEvent({
        actionKey: "analytics.report.exported",
        actor,
        metadata: {
          ...auditMetadata,
          byteLength: staged.byteLength,
          phase: "completed",
        },
        subjects: resumeAuditSubject(hackathonId),
      });
    } catch (error) {
      staged.stream.destroy();
      throw error;
    }
    return {
      fileName: `hackathon-resume-bundle-${generatedAt.slice(0, 10)}-part-${partNumber}-of-${parts.length}.zip`,
      partCount: parts.length,
      partNumber,
      planFingerprint,
      resumeCount: selectedAvailable.length,
      skippedCount,
      stream: staged.stream,
    };
  } catch (error) {
    await createAdminAuditEvent({
      actionKey: "analytics.report.exported",
      actor,
      metadata: {
        ...auditMetadata,
        failureFamily:
          available.length === 0 ? "no_valid_resumes" : "archive_build",
        phase: "failed",
      },
      subjects: resumeAuditSubject(hackathonId),
    });
    throw error;
  }
}
