import { Routes } from "discord-api-types/v10";

import { and, eq, gte, lte, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
import {
  Hackathon,
  HackerParticipantCommand,
} from "@forge/db/schemas/knight-hacks";
import * as discord from "@forge/utils/discord";

import type { HackerPortalContext } from "./trpc";
import {
  HACKER_PARTICIPANT_COMMAND_RETENTION_MS,
  participantPayloadHash,
} from "./commands";
import { loadParticipantApplication, requirePortalHackathon } from "./data";
import { portalFailure } from "./trpc";

export async function reportIssue(
  ctx: HackerPortalContext,
  input: { description: string; idempotencyKey: string },
) {
  if (!ctx.session || !ctx.client) {
    portalFailure("SESSION_EXPIRED", "Sign in before reporting an issue.", {
      trpcCode: "UNAUTHORIZED",
    });
  }
  const { userId } = ctx.session;
  const { hackathonId } = ctx.client;
  const [application, hackathon, user, settings] = await Promise.all([
    loadParticipantApplication(userId, hackathonId),
    requirePortalHackathon(hackathonId),
    db.query.User.findFirst({
      columns: { name: true, discordUserId: true },
      where: eq(User.id, userId),
    }),
    db.query.Hackathon.findFirst({
      columns: { issueReportsChannelId: true, issueReportsRoleId: true },
      where: eq(Hackathon.id, hackathonId),
    }),
  ]);
  if (!application) {
    portalFailure(
      "FORBIDDEN",
      "Apply to this event before reporting an issue.",
      {
        trpcCode: "FORBIDDEN",
      },
    );
  }
  const channelId = settings?.issueReportsChannelId;
  if (!channelId) {
    portalFailure(
      "SUPPORT_UNAVAILABLE",
      "Issue reporting is not configured yet. Please contact an organizer in person.",
      {
        trpcCode: "PRECONDITION_FAILED",
      },
    );
  }
  const roleId = settings.issueReportsRoleId;
  const payloadHash = participantPayloadHash({ userId, hackathonId, ...input });
  const pending = await db.transaction(async (tx) => {
    // Serialize submissions across server instances so the limit cannot race.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`hacker-report:${userId}`}, 0))`,
    );
    const now = new Date();
    const commandValues = {
      expiresAt: new Date(
        now.getTime() + HACKER_PARTICIPANT_COMMAND_RETENTION_MS,
      ),
      hackathonId,
      idempotencyKey: input.idempotencyKey,
      operation: "report_issue",
      payloadHash,
      userId,
    };
    let [command] = await tx
      .insert(HackerParticipantCommand)
      .values(commandValues)
      .onConflictDoNothing()
      .returning({ id: HackerParticipantCommand.id });
    if (!command) {
      const [existing] = await tx
        .select({
          expiresAt: HackerParticipantCommand.expiresAt,
          id: HackerParticipantCommand.id,
          payloadHash: HackerParticipantCommand.payloadHash,
          state: HackerParticipantCommand.state,
        })
        .from(HackerParticipantCommand)
        .where(
          and(
            eq(HackerParticipantCommand.userId, userId),
            eq(HackerParticipantCommand.hackathonId, hackathonId),
            eq(HackerParticipantCommand.operation, "report_issue"),
            eq(HackerParticipantCommand.idempotencyKey, input.idempotencyKey),
          ),
        )
        .for("update")
        .limit(1);
      if (!existing)
        throw new Error("Participant command conflict row was not found.");
      if (existing.expiresAt <= now) {
        await tx
          .delete(HackerParticipantCommand)
          .where(
            and(
              eq(HackerParticipantCommand.id, existing.id),
              lte(HackerParticipantCommand.expiresAt, now),
            ),
          );
        [command] = await tx
          .insert(HackerParticipantCommand)
          .values(commandValues)
          .returning({ id: HackerParticipantCommand.id });
      } else {
        if (existing.payloadHash !== payloadHash) {
          portalFailure(
            "CONFLICT",
            "This idempotency key was already used with different input.",
            { trpcCode: "CONFLICT" },
          );
        }
        if (existing.state === "completed") return { delivered: true as const };
        command = { id: existing.id };
      }
    }
    if (!command) throw new Error("Issue report command could not be created.");
    const recent = await tx
      .select({ id: HackerParticipantCommand.id })
      .from(HackerParticipantCommand)
      .where(
        and(
          eq(HackerParticipantCommand.userId, userId),
          eq(HackerParticipantCommand.operation, "report_issue"),
          gte(
            HackerParticipantCommand.startedAt,
            new Date(now.getTime() - 10 * 60_000),
          ),
        ),
      )
      .limit(6);
    // Include pending deliveries so concurrent requests cannot all pass the
    // limit after the advisory lock is released.
    if (recent.length > 5) {
      portalFailure(
        "TOO_MANY_REQUESTS",
        "You have sent five reports recently. Please wait ten minutes or contact an organizer in person.",
        { trpcCode: "TOO_MANY_REQUESTS" },
      );
    }
    return { commandId: command.id, delivered: false as const };
  });
  if (pending.delivered) return { submitted: true as const };
  try {
    await discord.api.post(Routes.channelMessages(channelId), {
      body: {
        content: roleId ? `<@&${roleId}>` : undefined,
        allowed_mentions: { parse: [], roles: roleId ? [roleId] : [] },
        // A retry uses the same nonce, so Discord deduplicates delivery if the
        // first request succeeded before the follow-up database write failed.
        nonce: payloadHash.slice(0, 24),
        enforce_nonce: true,
        embeds: [
          {
            title: "Hacker issue report",
            description: input.description,
            fields: [
              {
                name: "Event",
                value: hackathon.displayName.slice(0, 1024),
              },
              {
                name: "Reporter",
                value: (user?.name ?? "Hacker").slice(0, 1024),
              },
              {
                name: "Discord user ID",
                value: user?.discordUserId ?? "Unavailable",
              },
            ],
          },
        ],
      },
    });
  } catch {
    await db
      .update(HackerParticipantCommand)
      .set({ safeErrorCode: "SUPPORT_UNAVAILABLE" })
      .where(
        and(
          eq(HackerParticipantCommand.id, pending.commandId),
          eq(HackerParticipantCommand.state, "started"),
        ),
      )
      .catch(() => undefined);
    portalFailure(
      "SUPPORT_UNAVAILABLE",
      "Your report could not be delivered. Please try again or contact an organizer in person.",
      { retryable: true, trpcCode: "BAD_GATEWAY" },
    );
  }
  await db
    .update(HackerParticipantCommand)
    .set({
      completedAt: new Date(),
      result: { submitted: true },
      safeErrorCode: null,
      state: "completed",
    })
    .where(
      and(
        eq(HackerParticipantCommand.id, pending.commandId),
        eq(HackerParticipantCommand.state, "started"),
      ),
    )
    .catch(() => undefined);
  return { submitted: true as const };
}
