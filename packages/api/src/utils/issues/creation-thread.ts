import { createHash } from "node:crypto";
import type { APIEmbed, APIMessage } from "discord-api-types/v10";
import { Routes } from "discord-api-types/v10";

import * as discord from "@forge/utils/discord";

import { nodeEnv } from "../../env";

const DISCORD_MESSAGE_LIMIT = 2_000;
const DISCORD_THREAD_NAME_LIMIT = 100;
const DISCORD_EMBED_DESCRIPTION_LIMIT = 3_800;
const DISCORD_EMBED_TOTAL_LIMIT = 6_000;

export interface IssueCreationThreadTarget {
  assigneeDiscordUserIds: readonly string[];
  channelId: string;
  description: string;
  dueAt: Date | null;
  eventId: string | null;
  id: string;
  links: readonly string[];
  name: string;
  parentId: string | null;
  priority: string;
  status: string;
  teamColor: string | null;
  teamDiscordRoleId: string;
  teamName: string;
  url: string;
}

export interface IssueCreationThreadMessage {
  allowedMentions: {
    parse: readonly string[];
    roles?: readonly string[];
    users?: readonly string[];
  };
  content: string;
  embeds: APIEmbed[];
  nonce: string;
}

export interface IssueCreationThreadPayload {
  messages: IssueCreationThreadMessage[];
  starter: IssueCreationThreadMessage;
  threadName: string;
}

export interface IssueCreationThreadGateway {
  createStarterMessage(input: {
    channelId: string;
    message: IssueCreationThreadMessage;
  }): Promise<{ id: string }>;
  ensureThread(input: {
    channelId: string;
    starterMessageId: string;
    threadName: string;
  }): Promise<void>;
  sendThreadMessage(input: {
    message: IssueCreationThreadMessage;
    threadId: string;
  }): Promise<void>;
}

function deliveryNonce(issueId: string, part: string) {
  return createHash("sha256")
    .update(`issue-thread:${issueId}:${part}`)
    .digest("hex")
    .slice(0, 24);
}

function neutralizeMentions(value: string) {
  return value
    .replace(/<@&?/g, "<@\u200b")
    .replace(/<!/g, "<!\u200b")
    .replace(/@everyone/gi, "@\u200beveryone")
    .replace(/@here/gi, "@\u200bhere");
}

function escapeMarkdown(value: string) {
  return neutralizeMentions(value).replace(/([\\`*_[\]{}()~|>])/g, "\\$1");
}

function singleLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function threadName(value: string) {
  const normalized = singleLine(neutralizeMentions(value));
  return Array.from(normalized || "Issue discussion")
    .slice(0, DISCORD_THREAD_NAME_LIMIT)
    .join("");
}

function splitText(value: string, limit = DISCORD_EMBED_DESCRIPTION_LIMIT) {
  const chunks: string[] = [];
  let remaining = value.trim();
  while (remaining.length > limit) {
    const candidate = remaining.slice(0, limit + 1);
    const newline = candidate.lastIndexOf("\n");
    const space = candidate.lastIndexOf(" ");
    const naturalSplit = Math.max(newline, space);
    const splitAt =
      naturalSplit >= Math.floor(limit * 0.6) ? naturalSplit : limit;
    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function embedMessage(
  issueId: string,
  part: string,
  embed: APIEmbed,
): IssueCreationThreadMessage {
  return {
    allowedMentions: { parse: [] },
    content: "",
    embeds: [embed],
    nonce: deliveryNonce(issueId, part),
  };
}

function embedColor(color: string | null) {
  if (!color || !/^#[\da-f]{6}$/i.test(color)) return undefined;
  const parsed = Number.parseInt(color.slice(1), 16);
  return parsed > 0 ? parsed : undefined;
}

function dueValue(dueAt: Date | null) {
  return dueAt ? `<t:${Math.floor(dueAt.getTime() / 1_000)}:F>` : "Not set";
}

function issueFields(target: IssueCreationThreadTarget): APIEmbed["fields"] {
  return [
    {
      inline: true,
      name: "Team",
      value: escapeMarkdown(target.teamName),
    },
    {
      inline: true,
      name: "Status",
      value: escapeMarkdown(target.status),
    },
    {
      inline: true,
      name: "Priority",
      value: escapeMarkdown(target.priority),
    },
    { inline: true, name: "Due", value: dueValue(target.dueAt) },
    {
      inline: true,
      name: "Assigned",
      value: String(target.assigneeDiscordUserIds.length || "Owning team"),
    },
    ...(target.eventId
      ? [{ inline: true, name: "Club event", value: "Linked" }]
      : []),
    ...(target.parentId
      ? [{ inline: true, name: "Hierarchy", value: "Child issue" }]
      : []),
  ];
}

function descriptionMessages(target: IssueCreationThreadTarget) {
  const chunks = splitText(neutralizeMentions(target.description));
  const color = embedColor(target.teamColor);
  return chunks.slice(1).map((chunk, index) =>
    embedMessage(target.id, `description-${index + 1}`, {
      ...(color !== undefined && { color }),
      description: chunk,
      title: "Description continued",
    }),
  );
}

function linkMessages(target: IssueCreationThreadTarget) {
  const lines = target.links.map((link, index) =>
    link.length <= DISCORD_EMBED_DESCRIPTION_LIMIT - 10
      ? `${index + 1}. <${link}>`
      : `${index + 1}. Link is too long to mirror in Discord.`,
  );
  if (lines.length === 0) return [];
  const color = embedColor(target.teamColor);
  return splitText(lines.join("\n")).map((chunk, index) =>
    embedMessage(target.id, `links-${index}`, {
      ...(color !== undefined && { color }),
      description: chunk,
      title: index === 0 ? "Links" : "Links continued",
    }),
  );
}

function audienceMessage(target: IssueCreationThreadTarget) {
  const users = [...new Set(target.assigneeDiscordUserIds)].sort();
  const roles = users.length === 0 ? [target.teamDiscordRoleId] : [];
  const mentions = [
    ...users.map((id) => `<@${id}>`),
    ...roles.map((id) => `<@&${id}>`),
  ];
  return {
    allowedMentions: {
      parse: [] as string[],
      ...(roles.length > 0 && { roles }),
      ...(users.length > 0 && { users }),
    },
    content: `cc: ${mentions.join(" ")}`,
    embeds: [],
    nonce: deliveryNonce(target.id, "audience"),
  } satisfies IssueCreationThreadMessage;
}

function starterMessage(target: IssueCreationThreadTarget) {
  const color = embedColor(target.teamColor);
  const [firstDescription = "No description provided."] = splitText(
    neutralizeMentions(target.description),
  );
  return embedMessage(target.id, "starter", {
    ...(color !== undefined && { color }),
    description: firstDescription,
    fields: issueFields(target),
    footer: { text: "A discussion thread is attached to this message." },
    title: threadName(target.name),
    url: target.url,
  });
}

function embedTextLength(embed: APIEmbed) {
  return (
    (embed.title?.length ?? 0) +
    (embed.description?.length ?? 0) +
    (embed.footer?.text.length ?? 0) +
    (embed.author?.name.length ?? 0) +
    (embed.fields?.reduce(
      (total, field) => total + field.name.length + field.value.length,
      0,
    ) ?? 0)
  );
}

export function buildIssueCreationThreadPayload(
  target: IssueCreationThreadTarget,
): IssueCreationThreadPayload {
  const payload = {
    messages: [
      ...descriptionMessages(target),
      ...linkMessages(target),
      audienceMessage(target),
    ],
    starter: starterMessage(target),
    threadName: threadName(target.name),
  };

  if (
    payload.starter.content.length > DISCORD_MESSAGE_LIMIT ||
    payload.messages.some(
      (message) => message.content.length > DISCORD_MESSAGE_LIMIT,
    ) ||
    [payload.starter, ...payload.messages].some((message) =>
      message.embeds.some(
        (embed) =>
          (embed.description?.length ?? 0) >
            DISCORD_EMBED_DESCRIPTION_LIMIT + 100 ||
          embedTextLength(embed) > DISCORD_EMBED_TOTAL_LIMIT,
      ),
    )
  ) {
    throw new Error("Issue thread content exceeds Discord's payload limits.");
  }
  return payload;
}

export async function deliverIssueCreationThread(
  target: IssueCreationThreadTarget,
  gateway: IssueCreationThreadGateway,
) {
  const payload = buildIssueCreationThreadPayload(target);
  const starter = await gateway.createStarterMessage({
    channelId: target.channelId,
    message: payload.starter,
  });
  await gateway.ensureThread({
    channelId: target.channelId,
    starterMessageId: starter.id,
    threadName: payload.threadName,
  });
  for (const message of payload.messages) {
    await gateway.sendThreadMessage({ message, threadId: starter.id });
  }
  return { starterMessageId: starter.id, threadId: starter.id };
}

export function createLiveIssueCreationThreadGateway(): IssueCreationThreadGateway {
  return {
    async createStarterMessage({ channelId, message }) {
      const created = (await discord.api.post(
        Routes.channelMessages(channelId),
        {
          body: {
            allowed_mentions: message.allowedMentions,
            content: message.content,
            embeds: message.embeds,
            enforce_nonce: true,
            nonce: message.nonce,
          },
        },
      )) as APIMessage;
      return { id: created.id };
    },
    async ensureThread({ channelId, starterMessageId, threadName }) {
      try {
        await discord.api.get(Routes.channel(starterMessageId));
        return;
      } catch {
        // The thread does not exist yet, or the read was ambiguous. The
        // create/read recovery below makes an accepted create safe to retry.
      }
      try {
        await discord.api.post(Routes.threads(channelId, starterMessageId), {
          body: { name: threadName },
        });
      } catch (cause) {
        try {
          await discord.api.get(Routes.channel(starterMessageId));
          return;
        } catch {
          throw cause;
        }
      }
    },
    async sendThreadMessage({ message, threadId }) {
      await discord.api.post(Routes.channelMessages(threadId), {
        body: {
          allowed_mentions: message.allowedMentions,
          content: message.content,
          embeds: message.embeds,
          enforce_nonce: true,
          nonce: message.nonce,
        },
      });
    },
  };
}

export async function deliverLiveIssueCreationThread(
  target: IssueCreationThreadTarget,
) {
  const enabled =
    nodeEnv === "production" ||
    process.env.ISSUE_DISCORD_THREADS_ENABLED === "true";
  if (!enabled) return { status: "suppressed" as const };
  const delivery = await deliverIssueCreationThread(
    target,
    createLiveIssueCreationThreadGateway(),
  );
  return { ...delivery, status: "delivered" as const };
}
