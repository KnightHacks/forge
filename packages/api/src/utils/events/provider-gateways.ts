import type { APIChannel, APIGuildScheduledEvent } from "discord-api-types/v10";
import {
  ChannelType,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  Routes,
} from "discord-api-types/v10";

import { DISCORD, EVENTS } from "@forge/consts";

import type {
  EventProjectionRequest,
  EventWorkflowRecord,
} from "./orchestration";

type GatewayResult =
  | { id: string; kind: "success"; request?: EventProjectionRequest }
  | { kind: "not_found" }
  | { kind: "transient_error"; message: string }
  | { kind: "unknown"; message: string };

function statusOf(error: unknown) {
  return (error as { status?: number } | null)?.status;
}

function classifyError(
  error: unknown,
  ambiguousMutation: boolean,
): GatewayResult {
  const status = statusOf(error);
  if (status === 404) return { kind: "not_found" };
  const message =
    error instanceof Error ? error.message : "Provider request failed.";
  if (ambiguousMutation && (status === undefined || status >= 500)) {
    return { kind: "unknown", message };
  }
  return { kind: "transient_error", message };
}

function discordEntityType(request: EventProjectionRequest) {
  if (request.entityType === "voice")
    return GuildScheduledEventEntityType.Voice;
  if (request.entityType === "stage") {
    return GuildScheduledEventEntityType.StageInstance;
  }
  return GuildScheduledEventEntityType.External;
}

function discordBody(request: EventProjectionRequest) {
  const external = request.entityType === "external";
  return {
    channel_id: external ? null : request.channelId,
    description: request.description,
    entity_metadata: external ? { location: request.location } : null,
    entity_type: discordEntityType(request),
    name: request.title,
    privacy_level: GuildScheduledEventPrivacyLevel.GuildOnly,
    scheduled_end_time: request.endAt.toISOString(),
    scheduled_start_time: request.startAt.toISOString(),
  };
}

function discordLiveProjection(event: APIGuildScheduledEvent) {
  const entityType =
    event.entity_type === GuildScheduledEventEntityType.External
      ? ("external" as const)
      : event.entity_type === GuildScheduledEventEntityType.StageInstance
        ? ("stage" as const)
        : ("voice" as const);
  return {
    id: event.id,
    request: {
      channelId: event.channel_id,
      creationKey: "",
      description: event.description ?? "",
      destination:
        entityType === "external"
          ? "external"
          : `${entityType}:${event.channel_id}`,
      endAt: new Date(event.scheduled_end_time ?? event.scheduled_start_time),
      entityType,
      eventId: "",
      location: event.entity_metadata?.location ?? "",
      points: 0,
      revision: 0,
      startAt: new Date(event.scheduled_start_time),
      title: event.name,
    },
  };
}

export function createDiscordEventGateway() {
  return {
    async create(request: EventProjectionRequest): Promise<GatewayResult> {
      try {
        const discord = await import("@forge/utils/discord");
        const created = (await discord.api.post(
          Routes.guildScheduledEvents(DISCORD.KNIGHTHACKS_GUILD),
          { body: discordBody(request) },
        )) as { id: string };
        return { id: created.id, kind: "success" };
      } catch (error) {
        return classifyError(error, true);
      }
    },

    async delete(id: string): Promise<GatewayResult> {
      try {
        const discord = await import("@forge/utils/discord");
        await discord.api.delete(
          Routes.guildScheduledEvent(DISCORD.KNIGHTHACKS_GUILD, id),
        );
        return { id, kind: "success" };
      } catch (error) {
        return classifyError(error, true);
      }
    },

    async get(id: string): Promise<GatewayResult> {
      try {
        const discord = await import("@forge/utils/discord");
        const event = (await discord.api.get(
          Routes.guildScheduledEvent(DISCORD.KNIGHTHACKS_GUILD, id),
        )) as APIGuildScheduledEvent;
        return {
          id: event.id,
          kind: "success",
          request: discordLiveProjection(event).request,
        };
      } catch (error) {
        return classifyError(error, false);
      }
    },

    async list() {
      const discord = await import("@forge/utils/discord");
      const events = (await discord.api.get(
        Routes.guildScheduledEvents(DISCORD.KNIGHTHACKS_GUILD),
      )) as APIGuildScheduledEvent[];
      return events.map(discordLiveProjection);
    },

    async update(
      id: string,
      request: EventProjectionRequest,
    ): Promise<GatewayResult> {
      try {
        const discord = await import("@forge/utils/discord");
        const updated = (await discord.api.patch(
          Routes.guildScheduledEvent(DISCORD.KNIGHTHACKS_GUILD, id),
          { body: discordBody(request) },
        )) as { id: string };
        return { id: updated.id, kind: "success" };
      } catch (error) {
        return classifyError(error, true);
      }
    },
  };
}

export async function resolveDiscordEventChannelType(channelId: string) {
  try {
    const discord = await import("@forge/utils/discord");
    const channel = (await discord.api.get(
      Routes.channel(channelId),
    )) as APIChannel;
    if (
      !("guild_id" in channel) ||
      channel.guild_id !== DISCORD.KNIGHTHACKS_GUILD
    ) {
      return null;
    }
    if (channel.type === ChannelType.GuildVoice) return "voice" as const;
    if (channel.type === ChannelType.GuildStageVoice) return "stage" as const;
    return null;
  } catch {
    return null;
  }
}

export async function listDiscordEventChannels() {
  const discord = await import("@forge/utils/discord");
  const channels = (await discord.api.get(
    Routes.guildChannels(DISCORD.KNIGHTHACKS_GUILD),
  )) as APIChannel[];
  const choices: { id: string; name: string; type: "stage" | "voice" }[] = [];
  for (const channel of channels) {
    if (
      !("guild_id" in channel) ||
      channel.guild_id !== DISCORD.KNIGHTHACKS_GUILD
    ) {
      continue;
    }
    if (channel.type === ChannelType.GuildVoice) {
      choices.push({ id: channel.id, name: channel.name, type: "voice" });
    }
    if (channel.type === ChannelType.GuildStageVoice) {
      choices.push({ id: channel.id, name: channel.name, type: "stage" });
    }
  }
  return choices;
}

function googleBody(request: EventProjectionRequest) {
  return {
    description: request.description,
    end: {
      dateTime: request.endAt.toISOString(),
      timeZone: EVENTS.CALENDAR_TIME_ZONE,
    },
    extendedProperties: { private: request.privateProperties },
    location: request.location,
    start: {
      dateTime: request.startAt.toISOString(),
      timeZone: EVENTS.CALENDAR_TIME_ZONE,
    },
    summary: request.title,
  };
}

function googleCalendarIds(appliedDestination?: string | null) {
  return appliedDestination
    ? [appliedDestination]
    : [...new Set([EVENTS.GOOGLE_CALENDAR_ID, EVENTS.DEV_GOOGLE_CALENDAR_ID])];
}

export function createGoogleEventGateway() {
  return {
    async create(request: EventProjectionRequest): Promise<GatewayResult> {
      try {
        const google = await import("@forge/utils/google");
        const response = await google.calendar.events.insert({
          calendarId: request.destination,
          requestBody: googleBody(request),
        });
        return response.data.id
          ? { id: response.data.id, kind: "success" }
          : { kind: "unknown", message: "Google returned no event ID." };
      } catch (error) {
        return classifyError(error, true);
      }
    },

    async delete(
      id: string,
      appliedDestination?: string | null,
    ): Promise<GatewayResult> {
      try {
        const google = await import("@forge/utils/google");
        const calendarIds = googleCalendarIds(appliedDestination);
        for (const calendarId of calendarIds) {
          try {
            await google.calendar.events.delete({ calendarId, eventId: id });
            return { id, kind: "success" };
          } catch (error) {
            if (statusOf(error) !== 404) throw error;
          }
        }
        return { kind: "not_found" };
      } catch (error) {
        return classifyError(error, true);
      }
    },

    async findByPrivateIdentity(eventId: string, creationKey: string) {
      const google = await import("@forge/utils/google");
      const matches = [];
      for (const calendarId of googleCalendarIds()) {
        const response = await google.calendar.events.list({
          calendarId,
          privateExtendedProperty: [
            `bladeEventId=${eventId}`,
            `bladeCreationKey=${creationKey}`,
          ],
          singleEvents: true,
        });
        for (const event of response.data.items ?? []) {
          if (!event.id) continue;
          const startAt = new Date(event.start?.dateTime ?? "");
          const endAt = new Date(event.end?.dateTime ?? "");
          matches.push({
            id: event.id,
            request: {
              channelId: null,
              creationKey,
              description: event.description ?? "",
              destination: calendarId,
              endAt,
              entityType: "external" as const,
              eventId,
              location: event.location ?? "",
              points: 0,
              privateProperties: event.extendedProperties?.private ?? {},
              revision: 0,
              startAt,
              title: event.summary ?? "",
            },
          });
        }
      }
      return matches;
    },

    async get(
      id: string,
      appliedDestination?: string | null,
    ): Promise<GatewayResult> {
      const google = await import("@forge/utils/google");
      const calendarIds = googleCalendarIds(appliedDestination);
      for (const calendarId of calendarIds) {
        try {
          const response = await google.calendar.events.get({
            calendarId,
            eventId: id,
          });
          if (response.data.id) {
            const privateProperties = Object.fromEntries(
              Object.entries(
                response.data.extendedProperties?.private ?? {},
              ).filter((entry): entry is [string, string] => Boolean(entry[1])),
            );
            return {
              id: response.data.id,
              kind: "success",
              request: {
                channelId: null,
                creationKey: privateProperties.bladeCreationKey ?? "",
                description: response.data.description ?? "",
                destination: calendarId,
                endAt: new Date(response.data.end?.dateTime ?? ""),
                entityType: "external",
                eventId: privateProperties.bladeEventId ?? "",
                location: response.data.location ?? "",
                points: 0,
                privateProperties,
                revision: 0,
                startAt: new Date(response.data.start?.dateTime ?? ""),
                title: response.data.summary ?? "",
              },
            };
          }
        } catch (error) {
          if (statusOf(error) !== 404) return classifyError(error, false);
        }
      }
      return { kind: "not_found" };
    },

    list() {
      return Promise.resolve([]);
    },

    async update(
      id: string,
      request: EventProjectionRequest,
    ): Promise<GatewayResult> {
      try {
        const google = await import("@forge/utils/google");
        const response = await google.calendar.events.update({
          calendarId: request.destination,
          eventId: id,
          requestBody: googleBody(request),
        });
        return response.data.id
          ? { id: response.data.id, kind: "success" }
          : { id, kind: "success" };
      } catch (error) {
        return classifyError(error, true);
      }
    },
  };
}

export async function auditEventMutation(entry: {
  action:
    | "create"
    | "delete"
    | "repair"
    | "resolve_discord"
    | "sync"
    | "update"
    | "update_legacy";
  actorId: string;
  eventId: string;
}) {
  const discord = await import("@forge/utils/discord");
  await discord.log({
    color: "blade_purple",
    message: `Actor ${entry.actorId}; event ${entry.eventId}`,
    title: `Event ${entry.action}`,
    userId: entry.actorId,
  });
}

export async function auditEventTagMutation(entry: {
  action: "archive" | "create" | "update";
  actorId: string;
  tagId: string;
}) {
  const discord = await import("@forge/utils/discord");
  await discord.log({
    color: "blade_purple",
    message: `Actor ${entry.actorId}; tag ${entry.tagId}`,
    title: `Event tag ${entry.action}`,
    userId: entry.actorId,
  });
}

export async function auditEventAttendanceMutation(entry: {
  action: "check_in" | "remove_attendance";
  actorId: string;
  eventId: string;
  memberId: string;
}) {
  const discord = await import("@forge/utils/discord");
  await discord.log({
    color: "blade_purple",
    message: `Actor ${entry.actorId}; event ${entry.eventId}; member ${entry.memberId}`,
    title:
      entry.action === "check_in"
        ? "Club event check-in"
        : "Club attendance removed",
    userId: entry.actorId,
  });
}

export function eventGoogleCalendars() {
  return {
    internal: EVENTS.DEV_GOOGLE_CALENDAR_ID,
    public: EVENTS.GOOGLE_CALENDAR_ID,
  };
}

export function appliedChannelType(event: EventWorkflowRecord) {
  return event.discordChannel?.type ?? null;
}
