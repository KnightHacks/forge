import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hackathon,
  Project,
  ProjectChallenge,
  ProjectMember,
  ProjectToChallenge,
} from "@forge/db/schemas/knight-hacks";

import type { AuditActor } from "./utils/audit/service";
import {
  captureAdminAuditActor,
  createAdminAuditEvent,
} from "./utils/audit/service";
import {
  parseDevpostProjects,
  ProjectImportError,
} from "./utils/projects/devpost-import";

export { ProjectImportError };

export const PROJECT_IMPORT_MAX_BYTES = 25 * 1024 * 1024;

export async function importDevpostProjects(input: {
  actor: AuditActor;
  csvContent: string;
  fileSize: number;
  hackathonId: string;
}) {
  if (input.fileSize > PROJECT_IMPORT_MAX_BYTES) {
    throw new ProjectImportError("The CSV must be 25 MiB or smaller.");
  }

  const parsed = parseDevpostProjects(input.csvContent);
  const auditActor = await captureAdminAuditActor(input.actor);
  const fileHash = createHash("sha256")
    .update(input.csvContent)
    .digest("hex")
    .slice(0, 16);

  return db.transaction(async (tx) => {
    const [hackathon] = await tx
      .select({ displayName: Hackathon.displayName, id: Hackathon.id })
      .from(Hackathon)
      .where(eq(Hackathon.id, input.hackathonId))
      .for("update")
      .limit(1);
    if (!hackathon) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Hackathon not found.",
      });
    }

    await tx.delete(Project).where(eq(Project.hackathonId, hackathon.id));
    await tx
      .delete(ProjectChallenge)
      .where(eq(ProjectChallenge.hackathonId, hackathon.id));

    const challenges = await tx
      .insert(ProjectChallenge)
      .values(
        parsed.challengeLabels.map((label) => ({
          hackathonId: hackathon.id,
          label,
        })),
      )
      .returning({ id: ProjectChallenge.id, label: ProjectChallenge.label });
    const challengeIds = new Map(
      challenges.map((challenge) => [challenge.label, challenge.id]),
    );

    const projects = await tx
      .insert(Project)
      .values(
        parsed.projects.map((project) => ({
          demoLinks: project.demoLinks,
          description: project.description,
          hackathonId: hackathon.id,
          participantCount: project.participantCount,
          prizeCategories: project.prizeCategories,
          projectCreatedAt: project.createdAt,
          submissionUrl: project.submissionUrl,
          submittedAt: project.submittedAt,
          technologies: project.technologies,
          title: project.title,
          universities: project.universities,
          videoUrl: project.videoUrl,
        })),
      )
      .returning({ id: Project.id, submissionUrl: Project.submissionUrl });
    const projectIds = new Map(
      projects.map((project) => [project.submissionUrl, project.id]),
    );

    const memberValues = parsed.projects.flatMap((project) => {
      const projectId = projectIds.get(project.submissionUrl);
      if (!projectId) throw new Error("Imported project ID was not returned.");
      return project.members.map((member) => ({
        displayOrder: member.order,
        email: member.email,
        name: member.name,
        projectId,
      }));
    });
    if (memberValues.length > 0) {
      await tx.insert(ProjectMember).values(memberValues);
    }

    const generalChallengeId = challengeIds.get("General");
    if (!generalChallengeId) {
      throw new Error("General challenge was not created.");
    }
    const joinValues = parsed.projects.flatMap((project) => {
      const projectId = projectIds.get(project.submissionUrl);
      if (!projectId) throw new Error("Imported project ID was not returned.");
      return Array.from(new Set(["General", ...project.prizeCategories])).map(
        (label) => {
          const challengeId = challengeIds.get(label);
          if (!challengeId) {
            throw new Error(`Imported challenge ${label} was not returned.`);
          }
          return { challengeId, hackathonId: hackathon.id, projectId };
        },
      );
    });
    if (joinValues.length > 0) {
      await tx.insert(ProjectToChallenge).values(joinValues);
    }

    await createAdminAuditEvent(
      {
        actionKey: "project.inventory_imported",
        actor: auditActor,
        metadata: {
          byteLength: input.fileSize,
          challengeCount: challenges.length,
          collapsedDuplicateRows: parsed.counts.collapsedDuplicateRows,
          excludedDraftProjects: parsed.counts.excludedDraftProjects,
          fileHash,
          memberCount: memberValues.length,
          projectCount: projects.length,
          rejectedProjects: parsed.counts.rejectedProjects,
        },
        subjects: [
          {
            relation: "primary",
            targetId: hackathon.id,
            targetLabel: hackathon.displayName,
            targetType: "hackathon",
          },
        ],
      },
      tx,
    );

    return {
      challengeCount: challenges.length,
      memberCount: memberValues.length,
      ...parsed.counts,
      rejections: parsed.rejections,
    };
  });
}
