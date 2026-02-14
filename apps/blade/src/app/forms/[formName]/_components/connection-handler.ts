"use server";

import { stringify } from "superjson";

import { appRouter } from "@forge/api";
import { log } from "@forge/api/utils";
import { auth } from "@forge/auth/server";

import { extractProcedures } from "~/lib/utils";
import { api } from "~/trpc/server";

export const handleCallbacks = async (
  name: string,
  id: string,
  response: Record<string, unknown>,
) => {
  const session = await auth();

  if (!session) return;

  const connections = await api.forms.getConnections({ id });
  const procs = extractProcedures(appRouter);

  for (const con of connections) {
    const data: Record<string, unknown> = {};
    for (const map of con.connections as {
      procField: string;
      formField?: string;
      customValue?: string;
    }[]) {
      if (map.customValue !== undefined) {
        data[map.procField] = map.customValue;
      } else if (map.formField && map.formField in response) {
        data[map.procField] = response[map.formField];
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
      await log({
        title: `Successfully automatically fired procedure`,
        message: `**Successfully fired procedure**\n\`${con.proc}\`\n\nTriggered after **${name}** submission from **${session.user.name}**`,
        color: "success_green",
        userId: session.user.discordUserId,
      });
    } catch (error) {
      const errorMessage = JSON.stringify(error, null, 2);
      await log({
        title: `Failed to automatically fire procedure`,
        message:
          `**Failed to fire procedure**\n\`${con.proc}\`\n\nTriggered after **${name}** submission from **${session.user.name}**\n\n**Data:**\n\`\`\`json\n${stringify(data)}\`\`\`` +
          `\n\n**Error:**\n\`\`\`json\n${errorMessage}\`\`\``,
        color: "uhoh_red",
        userId: session.user.discordUserId,
      });
    }
  }
};
