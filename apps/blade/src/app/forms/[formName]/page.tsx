import { redirect } from "next/navigation";
import { stringify } from "superjson";

import { appRouter } from "@forge/api";
import { log } from "@forge/api/utils";
import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { extractProcedures } from "~/lib/utils";
import { api, HydrateClient } from "~/trpc/server";
import { FormResponderClient } from "./_components/form-responder-client";

export default async function FormResponderPage({
  params,
}: {
  params: { formName: string };
}) {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  if (!params.formName) {
    return <div>Form not found</div>;
  }

  // handle url encode form names to allow spacing and special characters
  const formName = params.formName;

  // use blade member name instead of discord name
  let userName = session.user.name || "Member";
  try {
    const member = await api.member.getMember();
    if (member?.firstName) {
      userName = member.firstName;
    }
  } catch {
    // fallback to discord name if member lookup fails
  }

  const form = await api.forms.getForm({ slug_name: formName });
  const connections = await api.forms.getConnections({ id: form.id });
  const procs = extractProcedures(appRouter);

  const handleCallbacks = async (response: Record<string, unknown>) => {
    "use server";
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
          message: `**Successfully fired procedure**\n\`${con.proc}\`\n\nTriggered after **${form.name}** submission from **${session.user.name}**`,
          color: "success_green",
          userId: session.user.discordUserId,
        });
      } catch (error) {
        const errorMessage = JSON.stringify(error, null, 2);
        await log({
          title: `Failed to automatically fire procedure`,
          message:
            `**Failed to fire procedure**\n\`${con.proc}\`\n\nTriggered after **${form.name}** submission from **${session.user.name}**\n\n**Data:**\n\`\`\`json\n${stringify(data)}\`\`\`` +
            `\n\n**Error:**\n\`\`\`json\n${errorMessage}\`\`\``,
          color: "uhoh_red",
          userId: session.user.discordUserId,
        });
      }
    }
  };

  return (
    <HydrateClient>
      <FormResponderClient
        handleCallbacks={handleCallbacks}
        formName={formName}
        userName={userName}
      />
    </HydrateClient>
  );
}
