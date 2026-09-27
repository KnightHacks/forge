import { TRPCError } from "@trpc/server";

import { and, eq, gt, isNull, lte, or } from "@forge/db";
import { db } from "@forge/db/client";
import {
  GuestJudgeSession,
  HackathonJudgingConfiguration,
  Judge,
  JudgingRoomAccessLink,
  ProjectEvaluationDraft,
} from "@forge/db/schemas/knight-hacks";
import { logger } from "@forge/utils";

import type { WriteDb } from "../db";
import { captureAdminAuditActor } from "../audit/service";
import { writeEvaluation } from "../judging/evaluation-write";
import { lockScheduleHackathon } from "./source";

/** Caller holds the hackathon lock. Expiry is logically effective at deadlineAt. */
export async function reconcileExpiredDraftsWithDb(
  tx: WriteDb,
  hackathonId: string,
  now = new Date(),
) {
  const config = await tx.query.HackathonJudgingConfiguration.findFirst({
    where: eq(HackathonJudgingConfiguration.hackathonId, hackathonId),
  });
  const drafts = await tx
    .select()
    .from(ProjectEvaluationDraft)
    .where(
      and(
        eq(ProjectEvaluationDraft.hackathonId, hackathonId),
        isNull(ProjectEvaluationDraft.evaluationId),
        isNull(ProjectEvaluationDraft.reconciliationFailedAt),
        lte(ProjectEvaluationDraft.deadlineAt, now),
      ),
    )
    .for("update");
  for (const draft of drafts) {
    if (!draft.deadlineAt || !draft.appointmentId) continue;
    // Closing early leaves future deadlines read-only. Work already due when
    // closing was reconciled may still be materialized by a later request.
    if (
      config?.state !== "open" &&
      (!config?.closedAt || draft.deadlineAt > config.closedAt)
    )
      continue;
    const judge = await tx.query.Judge.findFirst({
      where: eq(Judge.id, draft.judgeId),
    });
    if (!judge) continue;
    const [guest] =
      judge.kind === "guest"
        ? await tx
            .select({ id: GuestJudgeSession.id })
            .from(GuestJudgeSession)
            .innerJoin(
              JudgingRoomAccessLink,
              eq(JudgingRoomAccessLink.id, GuestJudgeSession.accessLinkId),
            )
            .where(
              and(
                eq(GuestJudgeSession.judgeId, judge.id),
                gt(GuestJudgeSession.expiresAt, draft.deadlineAt),
                or(
                  isNull(GuestJudgeSession.revokedAt),
                  gt(GuestJudgeSession.revokedAt, draft.deadlineAt),
                ),
                or(
                  isNull(JudgingRoomAccessLink.revokedAt),
                  gt(JudgingRoomAccessLink.revokedAt, draft.deadlineAt),
                ),
              ),
            )
            .limit(1)
        : [];
    if (judge.kind === "guest" && !guest) continue;
    const actor =
      judge.kind === "member" && judge.userId
        ? await captureAdminAuditActor({
            id: judge.userId,
            name: judge.displayName,
          })
        : {
            id: guest?.id ?? judge.id,
            name: judge.displayName,
            snapshot: {
              memberId: null,
              roleColor: null,
              roleLabel: "Guest judge",
            },
          };
    try {
      await tx.transaction(async (draftTx) => {
        await writeEvaluation(draftTx, {
          ...draft,
          actor,
          principalKind: judge.kind,
          appointmentId: draft.appointmentId,
          autoSubmittedAt: draft.deadlineAt ?? undefined,
          expectedRevision: 0,
        });
        await draftTx
          .delete(ProjectEvaluationDraft)
          .where(eq(ProjectEvaluationDraft.id, draft.id));
      });
    } catch (error) {
      // A stale/deleted presentation must not prevent other deadlines from
      // completing. Keep its answers for recovery; never overwrite a result.
      if (
        !(error instanceof TRPCError) ||
        ![
          "NOT_FOUND",
          "CONFLICT",
          "BAD_REQUEST",
          "PRECONDITION_FAILED",
        ].includes(error.code)
      )
        throw error;
      logger.warn("Judging deadline draft retained for recovery", {
        draftId: draft.id,
        code: error.code,
      });
      await tx
        .update(ProjectEvaluationDraft)
        .set({
          reconciliationFailedAt: now,
          reconciliationErrorCode: error.code,
        })
        .where(eq(ProjectEvaluationDraft.id, draft.id));
    }
  }
}

export async function reconcileExpiredJudgingDrafts(hackathonId: string) {
  // Avoid an exclusive aggregate lock on each idle heartbeat.
  const due = await db.query.ProjectEvaluationDraft.findFirst({
    columns: { id: true },
    where: and(
      eq(ProjectEvaluationDraft.hackathonId, hackathonId),
      isNull(ProjectEvaluationDraft.evaluationId),
      isNull(ProjectEvaluationDraft.reconciliationFailedAt),
      lte(ProjectEvaluationDraft.deadlineAt, new Date()),
    ),
  });
  if (!due) return;
  await db.transaction(async (tx) => {
    await lockScheduleHackathon(tx, hackathonId);
    await reconcileExpiredDraftsWithDb(tx, hackathonId);
  });
}
