import type {
  ClientEvents,
  ClientOptions,
  Message,
  PartialMessage,
} from "discord.js";
import { Client, GatewayIntentBits, Partials } from "discord.js";

import { logger } from "@forge/utils";

import type { DiscordArchiveLiveStore } from "./live";
import {
  persistDiscordLiveMessage,
  persistDiscordLiveTombstones,
} from "./live";

type ArchiveMessageCreate = ClientEvents["messageCreate"][0];
type ArchiveMessageDelete = ClientEvents["messageDelete"][0];
type ArchiveMessageUpdate = ClientEvents["messageUpdate"][1] | PartialMessage;
type ArchiveBulkDeleteMessages = ClientEvents["messageDeleteBulk"][0];
type ArchiveBulkDeleteChannel = ClientEvents["messageDeleteBulk"][1];

interface ArchiveLogger {
  error(message: string): void;
  info(message: string): void;
}

interface ArchivePersistence {
  persistMessage(input: {
    message: Message<true>;
    now?: () => Date;
    store: DiscordArchiveLiveStore;
  }): Promise<void>;
  persistTombstones(input: {
    channel: ArchiveBulkDeleteChannel;
    messageIds: string[];
    now?: () => Date;
    store: DiscordArchiveLiveStore;
  }): Promise<void>;
}

export const discordArchiveClientOptions = {
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
} satisfies ClientOptions;

function safeErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (typeof error.code === "string" || typeof error.code === "number")
  ) {
    return String(error.code).slice(0, 64);
  }
  return "unknown";
}

function reportDiscordArchiveFailure(
  operation: string,
  error: unknown,
  log: ArchiveLogger,
) {
  log.error(
    `Discord archive ${operation} failed (${safeErrorCode(error)}). Reconciliation will retry.`,
  );
}

export async function safelyHandleDiscordArchiveEvent(input: {
  action: () => Promise<void>;
  log?: ArchiveLogger;
  operation: string;
}) {
  try {
    await input.action();
  } catch (error) {
    reportDiscordArchiveFailure(input.operation, error, input.log ?? logger);
  }
}

export function createDiscordArchiveGatewayHandlers(input: {
  guildId: string;
  now?: () => Date;
  persistence?: ArchivePersistence;
  store: DiscordArchiveLiveStore;
}) {
  const persistence = input.persistence ?? {
    persistMessage: persistDiscordLiveMessage,
    persistTombstones: persistDiscordLiveTombstones,
  };

  async function messageCreate(message: ArchiveMessageCreate) {
    if (message.guildId !== input.guildId || !message.inGuild()) return;
    await persistence.persistMessage({
      message,
      now: input.now,
      store: input.store,
    });
  }

  async function messageUpdate(message: ArchiveMessageUpdate) {
    if (message.guildId !== input.guildId) return;
    const current = message.partial ? await message.fetch() : message;
    if (current.guildId !== input.guildId || !current.inGuild()) return;
    await persistence.persistMessage({
      message: current,
      now: input.now,
      store: input.store,
    });
  }

  async function messageDelete(message: ArchiveMessageDelete) {
    if (message.guildId !== input.guildId || !message.inGuild()) return;
    await persistence.persistTombstones({
      channel: message.channel,
      messageIds: [message.id],
      now: input.now,
      store: input.store,
    });
  }

  async function messageDeleteBulk(
    messages: ArchiveBulkDeleteMessages,
    channel: ArchiveBulkDeleteChannel,
  ) {
    if (channel.guildId !== input.guildId) return;
    await persistence.persistTombstones({
      channel,
      messageIds: [...messages.keys()],
      now: input.now,
      store: input.store,
    });
  }

  return { messageCreate, messageDelete, messageDeleteBulk, messageUpdate };
}

export function startDiscordArchiveGateway(input: {
  guildId: string;
  log?: ArchiveLogger;
  store: DiscordArchiveLiveStore;
  token: string;
}) {
  const archiveClient = new Client(discordArchiveClientOptions);
  const handlers = createDiscordArchiveGatewayHandlers({
    guildId: input.guildId,
    store: input.store,
  });
  const log = input.log ?? logger;
  const run = (operation: string, action: () => Promise<void>) => {
    void safelyHandleDiscordArchiveEvent({ action, log, operation });
  };

  archiveClient.once("ready", () => {
    log.info("Discord archive Gateway is ready.");
  });
  archiveClient.on("error", (error) => {
    reportDiscordArchiveFailure("Gateway client", error, log);
  });
  archiveClient.on("messageCreate", (message) => {
    run("message create", () => handlers.messageCreate(message));
  });
  archiveClient.on("messageUpdate", (_oldMessage, newMessage) => {
    run("message update", () => handlers.messageUpdate(newMessage));
  });
  archiveClient.on("messageDelete", (message) => {
    run("message delete", () => handlers.messageDelete(message));
  });
  archiveClient.on("messageDeleteBulk", (messages, channel) => {
    run("bulk message delete", () =>
      handlers.messageDeleteBulk(messages, channel),
    );
  });

  void archiveClient.login(input.token).catch((error: unknown) => {
    reportDiscordArchiveFailure("login", error, log);
  });
  return archiveClient;
}
