"use server";

import { stringify } from "superjson";

import { appRouter } from "@forge/api";
import { auth } from "@forge/auth/server";
import { trpc } from "@forge/utils";
import * as discord from "@forge/utils/discord";

import { api } from "~/trpc/server";

export const handleCallbacks = async (
  name: string,
  id: string,
  response: Record<string, unknown>,
) => {
  const session = await auth();

  if (!session) return;

  const connections = await api.forms.getConnections({ id });
  const procs = trpc.extractProcedures(appRouter);

  for (const con of connections) {
    const data: Record<string, unknown> = {};
    const missingFields: string[] = [];
    const availableFields = Object.keys(response);

    for (const map of con.connections as {
      procField: string;
      formField?: string;
      customValue?: string;
    }[]) {
      if (map.customValue !== undefined) {
        data[map.procField] = map.customValue;
      } else if (map.formField) {
        // Try exact match first (handles whitespace differences too)
        const trimmedFormField = map.formField.trim();
        if (trimmedFormField in response) {
          data[map.procField] = response[trimmedFormField];
        } else {
          // Try case-insensitive match (also trim for whitespace tolerance)
          const matchedField = availableFields.find(
            (field) =>
              field.trim().toLowerCase() === trimmedFormField.toLowerCase(),
          );
          if (matchedField) {
            data[map.procField] = response[matchedField];
          } else {
            // Field not found - track it for error reporting
            missingFields.push(
              `${map.procField} (expected form field: "${map.formField}")`,
            );
          }
        }
      }
    }

    const route = procs[con.proc]?.route.split(".");
    if (!Array.isArray(route) || route.length < 2) continue;
    const [routerName, procName] = route as [keyof typeof api, string];
    const subroute = api[routerName];
    const proc = (
      subroute as Record<string, (input: unknown) => Promise<unknown>>
    )[procName];
    if (!proc) continue;

    try {
      await proc(data);
      await discord.log({
        title: `Successfully automatically fired procedure`,
        message: `**Successfully fired procedure**\n\`${con.proc}\`\n\nTriggered after **${name}** submission from **${session.user.name}**`,
        color: "success_green",
        userId: session.user.discordUserId,
      });
    } catch (error) {
      const errorMessage = JSON.stringify(error, null, 2);
      const missingFieldsMsg =
        missingFields.length > 0
          ? `\n\n**Missing Form Fields:**\n${missingFields.map((f) => `- ${f}`).join("\n")}\n\n**Available Form Fields:**\n${availableFields.map((f) => `- "${f}"`).join("\n")}`
          : "";
      await discord.log({
        title: `Failed to automatically fire procedure`,
        message:
          `**Failed to fire procedure**\n\`${con.proc}\`\n\nTriggered after **${name}** submission from **${session.user.name}**\n\n**Data:**\n\`\`\`json\n${stringify(data)}\`\`\`` +
          missingFieldsMsg +
          `\n\n**Error:**\n\`\`\`json\n${errorMessage}\`\`\``,
        color: "uhoh_red",
        userId: session.user.discordUserId,
      });
    }
  }
};
