import { randomUUID } from "node:crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import type { AuditTargetType } from "@forge/validators";
import { and, asc, desc, eq, gt, isNull, lte, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  JudgingAppointment,
  JudgingBuilding,
  JudgingSchedule,
  JudgingScheduleJob,
} from "@forge/db/schemas/knight-hacks";
import { logger } from "@forge/utils";
import {
  judgingAppointmentAssignSchema,
  judgingAppointmentIdSchema,
  judgingAppointmentMoveSchema,
  judgingBuildingCreateSchema,
  judgingHackathonIdSchema,
  judgingScheduleGenerateSchema,
  judgingScheduleJobSchema,
  judgingScheduleSaveSchema,
  judgingUnassignedPresentationSchema,
} from "@forge/validators";

import type {
  AuditActor,
  CreateAdminAuditEventInput,
} from "../utils/audit/service";
import type { WriteDb } from "../utils/db";
import { permProcedure } from "../trpc";
import {
  captureAdminAuditActor,
  createAdminAuditEvent,
} from "../utils/audit/service";
import {
  appointmentMoveChoices,
  readSavedSchedule,
} from "../utils/judging-schedule/appointments";
import {
  readStoredTiming,
  scheduleCandidateKey,
  scheduleProblemSchema,
  scheduleSearchSchema,
} from "../utils/judging-schedule/checkpoint";
import {
  reconcileExpiredDraftsWithDb,
  reconcileExpiredJudgingDrafts,
} from "../utils/judging-schedule/reconcile";
import {
  advanceScheduleSearch,
  createScheduleSearch,
} from "../utils/judging-schedule/solver";
import {
  lockScheduleHackathon,
  readScheduleSource,
  scheduleProblemFromSource,
} from "../utils/judging-schedule/source";
import { validateSchedule } from "../utils/judging-schedule/validate";
import { assertCanManageProjects } from "../utils/projects/access";

async function auditSchedule(
  tx: WriteDb,
  actor: AuditActor,
  hackathonId: string,
  actionKey: CreateAdminAuditEventInput["actionKey"],
  metadata: CreateAdminAuditEventInput["metadata"],
) {
  const subjectKeys = [
    ["appointmentId", "judging_appointment"],
    ["scheduleId", "judging_schedule"],
    ["jobId", "judging_schedule_job"],
  ] as const;
  const subject = subjectKeys.find(
    ([key]) => typeof metadata?.[key] === "string",
  );
  const targetId = subject ? String(metadata?.[subject[0]]) : hackathonId;
  const targetType: AuditTargetType = subject?.[1] ?? "hackathon";
  await createAdminAuditEvent(
    {
      actionKey,
      actor,
      metadata,
      subjects: [
        {
          relation: "primary",
          targetId,
          targetLabel: "Judging schedule",
          targetType,
        },
        ...(targetType !== "hackathon"
          ? [
              {
                relation: "secondary" as const,
                targetId: hackathonId,
                targetLabel: "Hackathon",
                targetType: "hackathon" as const,
              },
            ]
          : []),
      ],
    },
    tx,
  );
}

function publicJob(job: typeof JudgingScheduleJob.$inferSelect) {
  const search = scheduleSearchSchema.parse(job.checkpoint);
  const problem = scheduleProblemSchema.parse(job.problem);
  const timing = readStoredTiming(job.timing);
  const validation = search.incumbent
    ? validateSchedule(problem, search.incumbent, search.relaxed)
    : null;
  return {
    id: job.id,
    candidateKey: scheduleCandidateKey(search),
    createdAt: job.createdAt,
    expiresAt: job.expiresAt,
    status: job.status,
    timing,
    nodes: search.nodes,
    score: search.score,
    relaxed: search.relaxed,
    diagnostics: search.diagnostics,
    reducedBreaks: validation?.reducedBreaks ?? [],
    candidate: validation?.valid
      ? (search.incumbent?.map((placement) => ({
          projectId: problem.tasks[placement.taskIndex]?.projectId ?? "",
          challengeId: problem.tasks[placement.taskIndex]?.challengeId ?? "",
          roomId: problem.rooms[placement.roomIndex]?.id ?? "",
          startsAt: new Date(
            timing.startsAt.getTime() +
              placement.slot * problem.durationMinutes * 60_000,
          ),
        })) ?? [])
      : [],
  };
}

async function requireNoSchedule(tx: WriteDb, hackathonId: string) {
  const existing = await tx.query.JudgingSchedule.findFirst({
    columns: { id: true },
    where: eq(JudgingSchedule.hackathonId, hackathonId),
  });
  if (existing)
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "A schedule is already saved. Move appointments individually or use Drop schedule while it is eligible.",
    });
}

export const judgingScheduleRouter = {
  listScheduleAdmin: permProcedure
    .input(judgingHackathonIdSchema)
    .query(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      await reconcileExpiredJudgingDrafts(input.hackathonId);
      const saved = await readSavedSchedule(db, input.hackathonId);
      const job = await db.query.JudgingScheduleJob.findFirst({
        where: eq(JudgingScheduleJob.hackathonId, input.hackathonId),
        orderBy: desc(JudgingScheduleJob.createdAt),
      });
      return { ...saved, job: job ? publicJob(job) : null };
    }),

  listBuildings: permProcedure.query(async ({ ctx }) => {
    assertCanManageProjects(ctx);
    return db
      .select({ id: JudgingBuilding.id, name: JudgingBuilding.name })
      .from(JudgingBuilding)
      .orderBy(asc(JudgingBuilding.name));
  }),

  createBuilding: permProcedure
    .input(judgingBuildingCreateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const [created] = await tx
          .insert(JudgingBuilding)
          .values({ name: input.name })
          .onConflictDoNothing()
          .returning();
        const existing =
          created ??
          (await tx.query.JudgingBuilding.findFirst({
            where: sql`lower(btrim(${JudgingBuilding.name})) = lower(btrim(${input.name}))`,
          }));
        if (!existing) throw new Error("Building could not be saved.");
        if (created)
          await createAdminAuditEvent(
            {
              actionKey: "judging.building.created",
              actor,
              metadata: { buildingId: created.id, name: created.name },
              subjects: [
                {
                  relation: "primary",
                  targetId: created.id,
                  targetLabel: created.name,
                  targetType: "judging_building",
                },
              ],
            },
            tx,
          );
        return { id: existing.id, name: existing.name };
      });
    }),

  generateSchedule: permProcedure
    .input(judgingScheduleGenerateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        await lockScheduleHackathon(tx, input.hackathonId);
        await requireNoSchedule(tx, input.hackathonId);
        if (input.timing.startsAt <= new Date())
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Choose a judging window that starts in the future.",
          });
        const source = await readScheduleSource(tx, input.hackathonId);
        if (!source.tasks.length)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Import projects before generating a schedule.",
          });
        const problem = scheduleProblemFromSource(source, input.timing);
        const checkpoint = createScheduleSearch(problem);
        await tx
          .update(JudgingScheduleJob)
          .set({ status: "superseded", leaseToken: null, leaseExpiresAt: null })
          .where(
            and(
              eq(JudgingScheduleJob.hackathonId, input.hackathonId),
              eq(JudgingScheduleJob.status, "searching"),
            ),
          );
        await tx
          .delete(JudgingScheduleJob)
          .where(
            and(
              eq(JudgingScheduleJob.hackathonId, input.hackathonId),
              lte(JudgingScheduleJob.expiresAt, new Date()),
            ),
          );
        const [job] = await tx
          .insert(JudgingScheduleJob)
          .values({
            hackathonId: input.hackathonId,
            createdByUserId: ctx.session.user.id,
            sourceFingerprint: source.fingerprint,
            timing: input.timing,
            problem,
            checkpoint,
            status: checkpoint.exhausted ? "infeasible" : "searching",
            expiresAt: new Date(Date.now() + 290_000),
          })
          .returning();
        if (!job) throw new Error("Generation job was not created.");
        await auditSchedule(
          tx,
          actor,
          input.hackathonId,
          "judging.schedule.generated",
          { jobId: job.id, status: job.status },
        );
        return publicJob(job);
      });
    }),

  continueScheduleGeneration: permProcedure
    .input(judgingScheduleJobSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const leaseToken = randomUUID();
      const [job] = await db
        .update(JudgingScheduleJob)
        .set({ leaseToken, leaseExpiresAt: new Date(Date.now() + 15_000) })
        .where(
          and(
            eq(JudgingScheduleJob.id, input.jobId),
            eq(JudgingScheduleJob.hackathonId, input.hackathonId),
            eq(JudgingScheduleJob.status, "searching"),
            or(
              isNull(JudgingScheduleJob.leaseExpiresAt),
              gt(sql`now()`, JudgingScheduleJob.leaseExpiresAt),
            ),
          ),
        )
        .returning();
      if (!job) {
        const current = await db.query.JudgingScheduleJob.findFirst({
          where: and(
            eq(JudgingScheduleJob.id, input.jobId),
            eq(JudgingScheduleJob.hackathonId, input.hackathonId),
          ),
        });
        if (!current) throw new TRPCError({ code: "NOT_FOUND" });
        return publicJob(current);
      }
      const problem = scheduleProblemSchema.parse(job.problem);
      let search = scheduleSearchSchema.parse(job.checkpoint);
      const remaining = job.expiresAt.getTime() - Date.now();
      if (remaining > 0)
        advanceScheduleSearch(problem, search, {
          maxNodes: 100_000,
          maxMilliseconds: Math.min(750, remaining),
        });
      if (
        search.exhausted &&
        !search.incumbent &&
        !search.relaxed &&
        search.diagnostics.length === 0
      )
        search = createScheduleSearch(problem, true);
      const finished =
        search.exhausted || Date.now() >= job.expiresAt.getTime();
      const status = !finished
        ? "searching"
        : search.incumbent
          ? search.exhausted
            ? "optimal"
            : "feasible"
          : search.exhausted
            ? "infeasible"
            : "incomplete";
      return db.transaction(async (tx) => {
        const [updated] = await tx
          .update(JudgingScheduleJob)
          .set({
            checkpoint: search,
            status,
            leaseToken: null,
            leaseExpiresAt: null,
            revision: job.revision + 1,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(JudgingScheduleJob.id, job.id),
              eq(JudgingScheduleJob.leaseToken, leaseToken),
              eq(JudgingScheduleJob.status, "searching"),
            ),
          )
          .returning();
        if (!updated)
          throw new TRPCError({
            code: "CONFLICT",
            message: "This generation was replaced by another preview.",
          });
        if (finished)
          await auditSchedule(
            tx,
            actor,
            input.hackathonId,
            "judging.schedule.generated",
            { jobId: updated.id, status },
          );
        return publicJob(updated);
      });
    }),

  saveSchedule: permProcedure
    .input(judgingScheduleSaveSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        await lockScheduleHackathon(tx, input.hackathonId);
        await requireNoSchedule(tx, input.hackathonId);
        const [job] = await tx
          .select()
          .from(JudgingScheduleJob)
          .where(
            and(
              eq(JudgingScheduleJob.id, input.jobId),
              eq(JudgingScheduleJob.hackathonId, input.hackathonId),
            ),
          )
          .for("update")
          .limit(1);
        if (!job || !["searching", "optimal", "feasible"].includes(job.status))
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Generate a complete feasible preview before saving.",
          });
        const search = scheduleSearchSchema.parse(job.checkpoint);
        if (scheduleCandidateKey(search) !== input.candidateKey)
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "The preview improved. Review the current assignments and travel breaks before saving.",
          });
        const timing = readStoredTiming(job.timing);
        if (timing.startsAt <= new Date())
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "The judging window has already started. Generate a future window.",
          });
        const source = await readScheduleSource(tx, input.hackathonId);
        if (source.fingerprint !== job.sourceFingerprint)
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Projects, room locations, or staffing changed. Generate a fresh preview.",
          });
        const problem = scheduleProblemFromSource(source, timing);
        const validation = validateSchedule(
          problem,
          search.incumbent ?? [],
          search.relaxed,
        );
        if (!validation.valid)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: validation.errors.join(" "),
          });
        if (validation.reducedBreaks.length && !input.acknowledgeReducedBreaks)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Acknowledge the listed reduced cross-building breaks before saving.",
          });
        const [schedule] = await tx
          .insert(JudgingSchedule)
          .values({
            ...timing,
            hackathonId: input.hackathonId,
            savedByUserId: ctx.session.user.id,
            reducedBreaksAcknowledgedAt: validation.reducedBreaks.length
              ? new Date()
              : null,
          })
          .returning();
        if (!schedule) throw new Error("Schedule was not saved.");
        const values = (search.incumbent ?? []).map((placement) => {
          const task = problem.tasks[placement.taskIndex];
          const room = problem.rooms[placement.roomIndex];
          if (!task || !room)
            throw new Error("Candidate references an unknown task or room.");
          const startsAt = new Date(
            timing.startsAt.getTime() +
              placement.slot * problem.durationMinutes * 60_000,
          );
          return {
            scheduleId: schedule.id,
            hackathonId: input.hackathonId,
            projectId: task.projectId,
            challengeId: task.challengeId,
            roomId: room.id,
            startsAt,
            deadlineAt: new Date(
              startsAt.getTime() +
                (timing.setupMinutes + timing.judgingMinutes) * 60_000,
            ),
            endsAt: new Date(
              startsAt.getTime() + problem.durationMinutes * 60_000,
            ),
          };
        });
        if (values.length) await tx.insert(JudgingAppointment).values(values);
        await tx
          .update(JudgingScheduleJob)
          .set({ status: "saved", leaseToken: null, leaseExpiresAt: null })
          .where(eq(JudgingScheduleJob.id, job.id));
        await auditSchedule(
          tx,
          actor,
          input.hackathonId,
          "judging.schedule.saved",
          {
            scheduleId: schedule.id,
            appointmentCount: values.length,
            reducedBreakCount: validation.reducedBreaks.length,
          },
        );
        return { scheduleId: schedule.id };
      });
    }),

  dropSchedule: permProcedure
    .input(judgingHackathonIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      await reconcileExpiredJudgingDrafts(input.hackathonId);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        await lockScheduleHackathon(tx, input.hackathonId);
        await reconcileExpiredDraftsWithDb(tx, input.hackathonId);
        const schedule = await tx.query.JudgingSchedule.findFirst({
          where: eq(JudgingSchedule.hackathonId, input.hackathonId),
        });
        if (!schedule) return { dropped: false };
        if (schedule.firstResultAt)
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "The first scheduled result has been submitted. This schedule can no longer be dropped.",
          });
        await tx
          .delete(JudgingSchedule)
          .where(eq(JudgingSchedule.id, schedule.id));
        await auditSchedule(
          tx,
          actor,
          input.hackathonId,
          "judging.schedule.dropped",
          { scheduleId: schedule.id },
        );
        return { dropped: true };
      });
    }),

  getAppointmentMoveChoices: permProcedure
    .input(judgingAppointmentIdSchema)
    .query(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      await reconcileExpiredJudgingDrafts(input.hackathonId);
      const result = await appointmentMoveChoices(
        db,
        input.hackathonId,
        input.appointmentId,
      );
      try {
        await auditSchedule(
          db,
          await captureAdminAuditActor(ctx.session.user),
          input.hackathonId,
          "judging.appointment.contacts_viewed",
          {
            appointmentId: input.appointmentId,
            projectId: result.appointment.projectId,
            challengeId: result.appointment.challengeId,
            memberCount: result.members.length,
          },
        );
      } catch {
        // Contact discovery stays available if the audit store is unavailable.
        logger.warn("Judging contact read audit failed", {
          hackathonId: input.hackathonId,
          appointmentId: input.appointmentId,
        });
      }
      return result;
    }),

  getUnassignedPresentationChoices: permProcedure
    .input(judgingUnassignedPresentationSchema)
    .query(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      await reconcileExpiredJudgingDrafts(input.hackathonId);
      const result = await appointmentMoveChoices(
        db,
        input.hackathonId,
        null,
        new Date(),
        input,
      );
      try {
        await createAdminAuditEvent({
          actionKey: "judging.appointment.contacts_viewed",
          actor: await captureAdminAuditActor(ctx.session.user),
          metadata: {
            projectId: input.projectId,
            challengeId: input.challengeId,
            memberCount: result.members.length,
          },
          subjects: [
            {
              relation: "primary",
              targetId: input.projectId,
              targetLabel: result.appointment.title,
              targetType: "project",
            },
          ],
        });
      } catch {
        logger.warn("Judging contact read audit failed", {
          hackathonId: input.hackathonId,
          projectId: input.projectId,
          challengeId: input.challengeId,
        });
      }
      return result;
    }),

  assignPresentation: permProcedure
    .input(judgingAppointmentAssignSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      await reconcileExpiredJudgingDrafts(input.hackathonId);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        await lockScheduleHackathon(tx, input.hackathonId);
        const { schedule, choices } = await appointmentMoveChoices(
          tx,
          input.hackathonId,
          null,
          new Date(),
          input,
        );
        const choice = choices.find(
          (choice) =>
            choice.roomId === input.roomId &&
            choice.startsAt.getTime() === input.startsAt.getTime(),
        );
        if (!choice)
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "That opening is no longer available with the required breaks.",
          });
        if (choice.reducedBreakCount && !input.acknowledgeReducedBreaks)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Acknowledge the reduced cross-building break before assigning.",
          });
        const [appointment] = await tx
          .insert(JudgingAppointment)
          .values({
            hackathonId: input.hackathonId,
            scheduleId: schedule.id,
            projectId: input.projectId,
            challengeId: input.challengeId,
            roomId: choice.roomId,
            startsAt: choice.startsAt,
            deadlineAt: new Date(
              choice.startsAt.getTime() +
                (schedule.setupMinutes + schedule.judgingMinutes) * 60_000,
            ),
            endsAt: new Date(
              choice.startsAt.getTime() +
                (schedule.setupMinutes +
                  schedule.judgingMinutes +
                  schedule.teardownMinutes) *
                  60_000,
            ),
          })
          .returning();
        if (!appointment) throw new Error("Appointment was not assigned.");
        await auditSchedule(
          tx,
          actor,
          input.hackathonId,
          "judging.appointment.assigned",
          {
            appointmentId: appointment.id,
            projectId: input.projectId,
            challengeId: input.challengeId,
            roomId: choice.roomId,
            startsAt: choice.startsAt.toISOString(),
          },
        );
        return { appointmentId: appointment.id };
      });
    }),

  moveAppointment: permProcedure
    .input(judgingAppointmentMoveSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageProjects(ctx);
      await reconcileExpiredJudgingDrafts(input.hackathonId);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        await lockScheduleHackathon(tx, input.hackathonId);
        const { appointment, schedule, choices } = await appointmentMoveChoices(
          tx,
          input.hackathonId,
          input.appointmentId,
        );
        if (appointment.revision !== input.expectedRevision)
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "This appointment changed. Reload its current reservation.",
          });
        const choice = choices.find(
          (choice) =>
            choice.roomId === input.roomId &&
            choice.startsAt.getTime() === input.startsAt.getTime(),
        );
        if (!choice)
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "That opening is no longer available with the required breaks.",
          });
        if (choice.reducedBreakCount && !input.acknowledgeReducedBreaks)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Acknowledge the reduced cross-building break before moving.",
          });
        await tx
          .update(JudgingAppointment)
          .set({
            roomId: choice.roomId,
            startsAt: choice.startsAt,
            deadlineAt: new Date(
              choice.startsAt.getTime() +
                (schedule.setupMinutes + schedule.judgingMinutes) * 60_000,
            ),
            endsAt: new Date(
              choice.startsAt.getTime() +
                (schedule.setupMinutes +
                  schedule.judgingMinutes +
                  schedule.teardownMinutes) *
                  60_000,
            ),
            revision: appointment.revision + 1,
            updatedAt: new Date(),
          })
          .where(eq(JudgingAppointment.id, appointment.id));
        await auditSchedule(
          tx,
          actor,
          input.hackathonId,
          "judging.appointment.moved",
          {
            appointmentId: appointment.id,
            fromRoomId: appointment.roomId,
            toRoomId: choice.roomId,
            fromStartsAt: appointment.startsAt.toISOString(),
            toStartsAt: choice.startsAt.toISOString(),
            reducedBreakCount: choice.reducedBreakCount,
          },
        );
        return { moved: true };
      });
    }),
} satisfies TRPCRouterRecord;
