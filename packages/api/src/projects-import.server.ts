import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { and, eq, inArray, isNull } from "@forge/db";
import { db } from "@forge/db/client";
import {
  GuestJudgeSession,
  Hackathon,
  HackathonJudgingConfiguration,
  JudgingRoom,
  JudgingRoomAccessLink,
  JudgingRoomPresence,
  JudgingSchedule,
  Project,
  ProjectChallenge,
  ProjectEvaluation,
  ProjectMember,
  ProjectToChallenge,
} from "@forge/db/schemas/knight-hacks";

import type { AuditActor } from "./utils/audit/service";
import {
  captureAdminAuditActor,
  createAdminAuditEvent,
} from "./utils/audit/service";
import {
  challengeSelection,
  rebuildParentMemberships,
} from "./utils/projects/challenge-configuration";
import { importedChallengeLabels } from "./utils/projects/challenge-labels";
import {
  parseDevpostProjects,
  ProjectImportError,
} from "./utils/projects/devpost-import";
import { initializeJudgingGroups } from "./utils/projects/initialize-judging-groups";

export { ProjectImportError };

export const PROJECT_IMPORT_MAX_BYTES = 25 * 1024 * 1024;

export async function importDevpostProjects(input: {
  actor: AuditActor;
  csvContent: string;
  fileSize: number;
  hackathonId: string;
  mode?: "automatic" | "replace";
  confirmation?: string;
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

    const [lock, evaluation] = await Promise.all([
      tx.query.HackathonJudgingConfiguration.findFirst({
        columns: { projectInventoryLockedAt: true },
        where: eq(HackathonJudgingConfiguration.hackathonId, hackathon.id),
      }),
      tx.query.ProjectEvaluation.findFirst({
        columns: { id: true },
        where: eq(ProjectEvaluation.hackathonId, hackathon.id),
      }),
    ]);
    const locked =
      lock?.projectInventoryLockedAt !== null && lock !== undefined;
    const schedule = await tx.query.JudgingSchedule.findFirst({
      columns: { id: true },
      where: eq(JudgingSchedule.hackathonId, hackathon.id),
    });
    if (schedule && input.mode === "replace")
      throw new ProjectImportError(
        "A saved schedule exists. Add new projects normally, or drop the eligible schedule before replacing inventory.",
      );
    const addOnly =
      (locked || Boolean(evaluation) || Boolean(schedule)) &&
      input.mode !== "replace";
    if (evaluation && input.mode === "replace") {
      throw new ProjectImportError(
        "The project inventory cannot be replaced after judging submissions exist. Import normally to add new projects.",
      );
    }
    if (
      locked &&
      input.mode === "replace" &&
      input.confirmation !== hackathon.displayName
    ) {
      throw new ProjectImportError(
        "The confirmation does not match the hackathon name.",
      );
    }

    await initializeJudgingGroups(tx, hackathon.id);
    const currentChallenges = await tx
      .select({
        ...challengeSelection,
        importLabelMatch: ProjectChallenge.importLabelMatch,
      })
      .from(ProjectChallenge)
      .where(eq(ProjectChallenge.hackathonId, hackathon.id));
    if (!addOnly) {
      const importedLabels = new Set(parsed.challengeLabels);
      const assignedRooms = await tx
        .select({
          label: ProjectChallenge.label,
          isGroup: ProjectChallenge.isGroup,
          roomName: JudgingRoom.name,
        })
        .from(JudgingRoom)
        .innerJoin(
          ProjectChallenge,
          eq(ProjectChallenge.id, JudgingRoom.challengeId),
        )
        .where(
          and(
            eq(JudgingRoom.hackathonId, hackathon.id),
            isNull(JudgingRoom.archivedAt),
          ),
        );
      const omitted = assignedRooms.find(
        (room) => !room.isGroup && !importedLabels.has(room.label),
      );
      if (omitted)
        throw new ProjectImportError(
          `The replacement omits ${omitted.label}, which is assigned to ${omitted.roomName}. Reassign or archive that room first.`,
        );
      if (locked) {
        const now = new Date();
        const links = await tx
          .update(JudgingRoomAccessLink)
          .set({
            revokedAt: now,
            revokedByUserId: auditActor.id,
            revocationReason: "inventory-replaced",
          })
          .where(
            and(
              eq(JudgingRoomAccessLink.hackathonId, hackathon.id),
              isNull(JudgingRoomAccessLink.revokedAt),
            ),
          )
          .returning({ id: JudgingRoomAccessLink.id });
        if (links.length) {
          const sessions = await tx
            .update(GuestJudgeSession)
            .set({
              revokedAt: now,
              revokedByUserId: auditActor.id,
              revocationReason: "inventory-replaced",
            })
            .where(
              and(
                inArray(
                  GuestJudgeSession.accessLinkId,
                  links.map((link) => link.id),
                ),
                isNull(GuestJudgeSession.revokedAt),
              ),
            )
            .returning({ judgeId: GuestJudgeSession.judgeId });
          const judgeIds = sessions
            .map((session) => session.judgeId)
            .filter((id): id is string => id !== null);
          if (judgeIds.length) {
            await tx
              .update(JudgingRoomPresence)
              .set({ leftAt: now, leaveReason: "inventory-replaced" })
              .where(
                and(
                  inArray(JudgingRoomPresence.judgeId, judgeIds),
                  isNull(JudgingRoomPresence.leftAt),
                ),
              );
          }
        }
      }

      await tx.delete(Project).where(eq(Project.hackathonId, hackathon.id));
    }

    const importedChallenges = currentChallenges.filter(
      (challenge) => !challenge.isGroup,
    );
    const retainedLabels = new Set(
      importedChallenges.map((challenge) => challenge.label),
    );
    const challengeLabelsToCreate = parsed.challengeLabels.filter(
      (label) => !retainedLabels.has(label),
    );
    const createdChallenges = challengeLabelsToCreate.length
      ? await tx
          .insert(ProjectChallenge)
          .values(
            challengeLabelsToCreate.map((label) => ({
              hackathonId: hackathon.id,
              label,
              parentId:
                currentChallenges.find(
                  (group) =>
                    group.isGroup &&
                    group.importLabelMatch &&
                    label
                      .toLocaleLowerCase("en-US")
                      .includes(
                        group.importLabelMatch.toLocaleLowerCase("en-US"),
                      ),
                )?.id ?? null,
            })),
          )
          .returning({ id: ProjectChallenge.id, label: ProjectChallenge.label })
      : [];
    const challenges = [...currentChallenges, ...createdChallenges];
    const challengeIds = new Map(
      [...importedChallenges, ...createdChallenges].map((challenge) => [
        challenge.label,
        challenge.id,
      ]),
    );

    const existingProjects = addOnly
      ? await tx
          .select({ submissionUrl: Project.submissionUrl })
          .from(Project)
          .where(eq(Project.hackathonId, hackathon.id))
      : [];
    const existingUrls = new Set(
      existingProjects.map((project) => project.submissionUrl),
    );
    const projectsToInsert = addOnly
      ? parsed.projects.filter(
          (project) => !existingUrls.has(project.submissionUrl),
        )
      : parsed.projects;

    const projects = projectsToInsert.length
      ? await tx
          .insert(Project)
          .values(
            projectsToInsert.map((project) => ({
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
          .returning({ id: Project.id, submissionUrl: Project.submissionUrl })
      : [];
    const projectIds = new Map(
      projects.map((project) => [project.submissionUrl, project.id]),
    );

    const memberValues = projectsToInsert.flatMap((project) => {
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

    const joinValues = projectsToInsert.flatMap((project) => {
      const projectId = projectIds.get(project.submissionUrl);
      if (!projectId) throw new Error("Imported project ID was not returned.");
      return importedChallengeLabels(project.prizeCategories).map((label) => {
        const challengeId = challengeIds.get(label);
        if (!challengeId) {
          throw new Error(`Imported challenge ${label} was not returned.`);
        }
        return { challengeId, hackathonId: hackathon.id, projectId };
      });
    });
    if (joinValues.length > 0) {
      await tx.insert(ProjectToChallenge).values(joinValues);
    }

    await rebuildParentMemberships(
      tx,
      hackathon.id,
      projects.map((project) => project.id),
    );

    await createAdminAuditEvent(
      {
        actionKey: "project.inventory_imported",
        actor: auditActor,
        metadata: {
          byteLength: input.fileSize,
          addOnly,
          challengeCount: challenges.length,
          collapsedDuplicateRows: parsed.counts.collapsedDuplicateRows,
          excludedDraftProjects: parsed.counts.excludedDraftProjects,
          fileHash,
          memberCount: memberValues.length,
          projectCount: projects.length,
          skippedProjectCount: parsed.projects.length - projects.length,
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
      addOnly,
      challengeCount: challenges.length,
      newChallengeCount: createdChallenges.length,
      memberCount: memberValues.length,
      ...parsed.counts,
      importedProjects: projects.length,
      skippedProjects: parsed.projects.length - projects.length,
      rejections: parsed.rejections,
    };
  });
}
