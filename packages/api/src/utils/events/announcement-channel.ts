import { TRPCError } from "@trpc/server";

import type { Session } from "@forge/auth/server";

import { resolveRoleDiscordGateway } from "../roles/discord-gateway";

export async function validateEventAnnouncementChannel(
  channelId: string | null | undefined,
  session: Session,
) {
  if (!channelId) return;
  const gateway = await resolveRoleDiscordGateway(session);
  if (
    !(await gateway.validateTextChannel?.(channelId, {
      requireSendPermission: true,
    }))
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Choose a text or announcement channel in this Discord server where the bot has View Channel, Send Messages, and Embed Links permissions.",
    });
  }
}
