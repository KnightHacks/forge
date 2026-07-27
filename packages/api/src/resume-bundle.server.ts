import { PassThrough } from "node:stream";
import archiver from "archiver";

import type { Session } from "@forge/auth/server";
import { MINIO } from "@forge/consts";
import { asc, isNotNull } from "@forge/db";
import { db } from "@forge/db/client";
import { Member } from "@forge/db/schemas/knight-hacks";
import { logger } from "@forge/utils";

import { createAdminAuditEvent } from "./utils/audit/service";
import { createResumeBundlePlan } from "./utils/resume/bundle";
import {
  isResumeObjectOwnedByUser,
  RESUME_BUCKET_NAME,
} from "./utils/resume/security";
import { resumeStorageClient } from "./utils/resume/storage";

const PDF_MAGIC = "%PDF-";

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

export async function createMemberResumeBundle({
  actor,
}: {
  actor: Session["user"];
}) {
  const resumeRows = await db
    .select({
      firstName: Member.firstName,
      gradDate: Member.gradDate,
      id: Member.id,
      lastName: Member.lastName,
      major: Member.major,
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
  const members = resumeRows.flatMap((member) => {
    const resumeUrl = member.resumeUrl?.trim();
    return resumeUrl ? [{ ...member, resumeUrl }] : [];
  });
  const ownedMembers = members.filter((member) =>
    isResumeObjectOwnedByUser(member.resumeUrl, member.userId),
  );
  const invalidReferenceCount = members.length - ownedMembers.length;
  if (invalidReferenceCount > 0) {
    logger.warn(
      `Member resume bundle skipped ${invalidReferenceCount} invalid stored resume references.`,
    );
  }
  const availableMembers: typeof ownedMembers = [];
  for (let index = 0; index < ownedMembers.length; index += 12) {
    const available = await Promise.all(
      ownedMembers.slice(index, index + 12).map(async (member) => {
        try {
          const stat = await resumeStorageClient.statObject(
            RESUME_BUCKET_NAME,
            member.resumeUrl,
          );
          if (stat.size <= 0 || stat.size > MINIO.MAX_RESUME_SIZE) return null;
          return (await storedObjectStartsWithPdfMagic(member.resumeUrl))
            ? member
            : null;
        } catch {
          return null;
        }
      }),
    );
    availableMembers.push(
      ...available.filter((member): member is (typeof members)[number] =>
        Boolean(member),
      ),
    );
  }
  const unavailableCount = ownedMembers.length - availableMembers.length;
  if (unavailableCount > 0) {
    logger.warn(
      `Member resume bundle skipped ${unavailableCount} unavailable or invalid stored resume objects.`,
    );
  }
  const plan = createResumeBundlePlan(availableMembers);

  await createAdminAuditEvent({
    actionKey: "analytics.report.exported",
    actor,
    metadata: {
      dateFrom: null,
      dateTo: null,
      eventIds: [],
      kind: "resume_bundle",
      rowCount: availableMembers.length,
    },
    subjects: [
      {
        relation: "primary",
        targetId: "resume_bundle",
        targetLabel: "Member resume bundle",
        targetType: "analytics_report",
      },
    ],
  });

  const output = new PassThrough();
  const archive = archiver("zip", { store: true });
  const destroyOutput = (error: unknown) =>
    output.destroy(
      error instanceof Error
        ? error
        : new Error("Resume bundle archive generation failed."),
    );
  archive.on("error", destroyOutput);
  archive.on("warning", destroyOutput);
  archive.pipe(output);
  void (async () => {
    try {
      for (const root of ["All/", "Grad Term/", "University/", "Major/"]) {
        archive.append("", { name: root });
      }
      for (const [index, member] of availableMembers.entries()) {
        await appendResumeCopies({
          archive,
          content: await readResumeObject(member.resumeUrl),
          paths: plan[index]?.paths ?? [],
        });
      }
      await archive.finalize();
    } catch (error) {
      archive.abort();
      destroyOutput(error);
    }
  })();

  return {
    fileName: `member-resume-bundle-${new Date().toISOString().slice(0, 10)}.zip`,
    resumeCount: availableMembers.length,
    stream: output,
  };
}
