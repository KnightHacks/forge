import { TRPCError } from "@trpc/server";

import type {
  ApplicationSaveInput,
  ApplicationUpdateInput,
} from "@forge/validators";
import { and, asc, eq } from "@forge/db";
import {
  Job,
  JobApplication,
  JobApplicationHistory,
} from "@forge/db/schemas/job-board";
import { stageAllowsRound } from "@forge/validators";

import type { AuditActor } from "../audit/service";
import type { TransactionDb, WriteDb } from "../db";
import {
  loadMemberAuditIdentity,
  memberAuditSubject,
} from "../audit/member-subject";
import { createAdminAuditEvent } from "../audit/service";

/** The owner's view of an application: the only shape that carries notes. */
const ownApplicationColumns = {
  createdAt: JobApplication.createdAt,
  id: JobApplication.id,
  interviewLabel: JobApplication.interviewLabel,
  jobId: JobApplication.jobId,
  privateNotes: JobApplication.privateNotes,
  round: JobApplication.round,
  stage: JobApplication.stage,
  updatedAt: JobApplication.updatedAt,
  visibility: JobApplication.visibility,
} as const;

function notFound() {
  // Also the answer for another member's application, so its existence and
  // visibility are not revealed.
  return new TRPCError({
    code: "NOT_FOUND",
    message: "That application does not exist.",
  });
}

export async function listApplicationHistory(
  database: WriteDb,
  applicationId: string,
) {
  return await database
    .select({
      changedAt: JobApplicationHistory.changedAt,
      id: JobApplicationHistory.id,
      interviewLabel: JobApplicationHistory.interviewLabel,
      round: JobApplicationHistory.round,
      stage: JobApplicationHistory.stage,
    })
    .from(JobApplicationHistory)
    .where(eq(JobApplicationHistory.applicationId, applicationId))
    .orderBy(
      asc(JobApplicationHistory.changedAt),
      asc(JobApplicationHistory.id),
    );
}

async function withHistory<Row extends { id: string }>(
  database: WriteDb,
  application: Row,
) {
  return {
    ...application,
    history: await listApplicationHistory(database, application.id),
  };
}

/** Starts tracking a job. The first history entry is written with the row. */
export async function saveApplication({
  database,
  input,
  memberId,
}: {
  database: TransactionDb;
  input: ApplicationSaveInput;
  memberId: string;
}) {
  const [job] = await database
    .select({ id: Job.id })
    .from(Job)
    .where(eq(Job.id, input.jobId))
    .limit(1);
  if (!job) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "That job does not exist.",
    });
  }

  // `DO NOTHING` rather than catching the unique violation: a failed statement
  // would abort the transaction this runs in.
  const [application] = await database
    .insert(JobApplication)
    .values({
      interviewLabel: input.interviewLabel,
      jobId: input.jobId,
      memberId,
      privateNotes: input.privateNotes,
      round: input.round,
      stage: input.stage,
      visibility: input.visibility,
    })
    .onConflictDoNothing({
      target: [JobApplication.memberId, JobApplication.jobId],
    })
    .returning(ownApplicationColumns);
  if (!application) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already tracking this job.",
    });
  }

  await database.insert(JobApplicationHistory).values({
    applicationId: application.id,
    changedAt: input.occurredAt,
    interviewLabel: application.interviewLabel,
    round: application.round,
    stage: application.stage,
  });

  return await withHistory(database, application);
}

/**
 * Updates the caller's application. A change to stage, round or interview
 * label is progress and gets a dated history entry in the same transaction;
 * a notes-only or visibility-only edit does not.
 */
export async function updateApplication({
  database,
  input,
  memberId,
}: {
  database: TransactionDb;
  input: ApplicationUpdateInput;
  memberId: string;
}) {
  const [current] = await database
    .select(ownApplicationColumns)
    .from(JobApplication)
    .where(
      and(
        eq(JobApplication.id, input.applicationId),
        eq(JobApplication.memberId, memberId),
      ),
    )
    .limit(1)
    .for("update");
  if (!current) throw notFound();

  const stage = input.stage ?? current.stage;
  const interviewing = stageAllowsRound(stage);
  // The validator can only check these against a stage it was sent. This is
  // the same rule against the stored one.
  if (!interviewing && (input.round != null || input.interviewLabel != null)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Rounds and interview labels apply only while interviewing.",
    });
  }

  // Leaving `interviewing` clears both, which the table's checks require.
  const round = interviewing
    ? input.round !== undefined
      ? input.round
      : current.round
    : null;
  const interviewLabel = interviewing
    ? input.interviewLabel !== undefined
      ? input.interviewLabel
      : current.interviewLabel
    : null;
  const progressed =
    stage !== current.stage ||
    round !== current.round ||
    interviewLabel !== current.interviewLabel;

  if (input.occurredAt && !progressed) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "A date applies only when the stage, round, or interview label changes.",
    });
  }

  const [application] = await database
    .update(JobApplication)
    // `updatedAt` refreshes itself through `$onUpdate`.
    .set({
      interviewLabel,
      privateNotes: input.privateNotes,
      round,
      stage,
      visibility: input.visibility,
    })
    .where(eq(JobApplication.id, current.id))
    .returning(ownApplicationColumns);
  if (!application) throw notFound();

  if (progressed) {
    await database.insert(JobApplicationHistory).values({
      applicationId: application.id,
      changedAt: input.occurredAt,
      interviewLabel,
      round,
      stage,
    });
  }

  return await withHistory(database, application);
}

/** Stops tracking a job. Its history is removed with it. */
export async function removeApplication({
  actor,
  applicationId,
  database,
  memberId,
}: {
  actor: AuditActor;
  applicationId: string;
  database: TransactionDb;
  memberId: string;
}) {
  const [application] = await database
    .select({ id: JobApplication.id })
    .from(JobApplication)
    .where(
      and(
        eq(JobApplication.id, applicationId),
        eq(JobApplication.memberId, memberId),
      ),
    )
    .limit(1)
    .for("update");
  if (!application) throw notFound();

  // The audit log is read by officers, and a private application is private
  // from them too: the event names the member and nothing about the job.
  await createAdminAuditEvent(
    {
      actionKey: "job_board.application.removed",
      actor,
      subjects: [
        memberAuditSubject(await loadMemberAuditIdentity(actor.id, database)),
      ],
    },
    database,
  );

  await database
    .delete(JobApplication)
    .where(eq(JobApplication.id, application.id));
}
