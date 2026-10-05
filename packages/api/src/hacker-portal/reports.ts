import { Routes } from "discord-api-types/v10";

import { and, eq, gte, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
import {
  Hackathon,
  HackerParticipantCommand,
} from "@forge/db/schemas/knight-hacks";
import * as discord from "@forge/utils/discord";

import type { HackerPortalContext } from "./trpc";
import { participantPayloadHash, runParticipantCommand } from "./commands";
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
  return db.transaction(async (tx) => {
    // Serialize submissions across server instances so the limit cannot race.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`hacker-report:${userId}`}, 0))`,
    );
    return runParticipantCommand({
      tx,
      userId,
      hackathonId,
      input,
      operation: "report_issue",
      idempotencyKey: input.idempotencyKey,
      work: async () => {
        const recent = await tx
          .select({ id: HackerParticipantCommand.id })
          .from(HackerParticipantCommand)
          .where(
            and(
              eq(HackerParticipantCommand.userId, userId),
              eq(HackerParticipantCommand.operation, "report_issue"),
              eq(HackerParticipantCommand.state, "completed"),
              gte(
                HackerParticipantCommand.startedAt,
                new Date(Date.now() - 10 * 60_000),
              ),
            ),
          )
          .limit(5);
        if (recent.length >= 5) {
          portalFailure(
            "TOO_MANY_REQUESTS",
            "You have sent five reports recently. Please wait ten minutes or contact an organizer in person.",
            {
              trpcCode: "TOO_MANY_REQUESTS",
            },
          );
        }
        try {
          await discord.api.post(Routes.channelMessages(channelId), {
            body: {
              content: roleId ? `<@&${roleId}>` : undefined,
              allowed_mentions: { parse: [], roles: roleId ? [roleId] : [] },
              // Discord also deduplicates a retry if delivery succeeds but the
              // database transaction cannot commit. Never store report text.
              nonce: participantPayloadHash({
                userId,
                hackathonId,
                ...input,
              }).slice(0, 24),
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
          portalFailure(
            "SUPPORT_UNAVAILABLE",
            "Your report could not be delivered. Please try again or contact an organizer in person.",
            {
              retryable: true,
              trpcCode: "BAD_GATEWAY",
            },
          );
        }
        return { submitted: true as const };
      },
    });
  });
}
