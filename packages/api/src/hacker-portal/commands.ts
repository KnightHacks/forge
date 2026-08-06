import { createHash } from "node:crypto";

import { and, eq, lte } from "@forge/db";
import { HackerParticipantCommand } from "@forge/db/schemas/knight-hacks";

import type { TransactionDb } from "../utils/db";
import { portalFailure } from "./trpc";

export const HACKER_PARTICIPANT_COMMAND_RETENTION_MS =
  30 * 24 * 60 * 60 * 1_000;

interface ParticipantCommandReference {
  id: string;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function participantPayloadHash(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export async function runParticipantCommand<TResult extends object>({
  hackathonId,
  idempotencyKey,
  input,
  operation,
  tx,
  userId,
  work,
  persistResult,
  replayResult,
}: {
  hackathonId: string;
  idempotencyKey: string;
  input: unknown;
  operation: string;
  tx: TransactionDb;
  userId: string;
  work: (command: ParticipantCommandReference) => Promise<TResult>;
  /** Removes response-only secrets before the durable idempotency result is stored. */
  persistResult?: (result: TResult) => object;
  /** Rebuilds response-only data for an exact retry from the safe stored result. */
  replayResult?: (
    result: unknown,
    command: ParticipantCommandReference,
  ) => TResult;
}): Promise<TResult> {
  const payloadHash = participantPayloadHash(input);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + HACKER_PARTICIPANT_COMMAND_RETENTION_MS,
  );
  let [inserted] = await tx
    .insert(HackerParticipantCommand)
    .values({
      expiresAt,
      hackathonId,
      idempotencyKey,
      operation,
      payloadHash,
      userId,
    })
    .onConflictDoNothing()
    .returning({ id: HackerParticipantCommand.id });

  if (!inserted) {
    const [existing] = await tx
      .select({
        expiresAt: HackerParticipantCommand.expiresAt,
        id: HackerParticipantCommand.id,
        payloadHash: HackerParticipantCommand.payloadHash,
        result: HackerParticipantCommand.result,
        state: HackerParticipantCommand.state,
      })
      .from(HackerParticipantCommand)
      .where(
        and(
          eq(HackerParticipantCommand.userId, userId),
          eq(HackerParticipantCommand.hackathonId, hackathonId),
          eq(HackerParticipantCommand.operation, operation),
          eq(HackerParticipantCommand.idempotencyKey, idempotencyKey),
        ),
      )
      .for("update")
      .limit(1);
    if (!existing) {
      throw new Error("Participant command conflict row was not found.");
    }

    // Expiry is an actual end to the idempotency window, not just a hint for a
    // background janitor. Reclaiming under the row lock prevents a lagging cron
    // from making old results replay forever and makes the key reusable exactly
    // once after the retention window.
    if (existing.expiresAt <= now) {
      await tx
        .delete(HackerParticipantCommand)
        .where(
          and(
            eq(HackerParticipantCommand.id, existing.id),
            lte(HackerParticipantCommand.expiresAt, now),
          ),
        );
      [inserted] = await tx
        .insert(HackerParticipantCommand)
        .values({
          expiresAt,
          hackathonId,
          idempotencyKey,
          operation,
          payloadHash,
          userId,
        })
        .returning({ id: HackerParticipantCommand.id });
      if (!inserted) {
        throw new Error("Expired participant command could not be reclaimed.");
      }
    } else {
      if (existing.payloadHash !== payloadHash) {
        portalFailure(
          "CONFLICT",
          "This idempotency key was already used with different input.",
          { trpcCode: "CONFLICT" },
        );
      }
      if (existing.state !== "completed" || !existing.result) {
        portalFailure(
          "CONFLICT",
          "The matching participant request is still being processed.",
          { retryable: true, trpcCode: "CONFLICT" },
        );
      }
      return replayResult
        ? replayResult(existing.result, { id: existing.id })
        : (existing.result as TResult);
    }
  }

  const result = await work({ id: inserted.id });
  await tx
    .update(HackerParticipantCommand)
    .set({
      completedAt: new Date(),
      result: persistResult ? persistResult(result) : result,
      state: "completed",
    })
    .where(eq(HackerParticipantCommand.id, inserted.id));
  return result;
}
