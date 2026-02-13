import { redirect } from "next/navigation";
import { XCircle } from "lucide-react";
import { stringify } from "superjson";

import { appRouter } from "@forge/api";
import { log } from "@forge/api/utils";
import { auth } from "@forge/auth/server";
import { Card } from "@forge/ui/card";

import { extractProcedures } from "~/lib/utils";
import { api, HydrateClient } from "~/trpc/server";
import FormNotFound from "~/app/_components/forms/form-not-found";
import { FormResponderWrapper } from "~/app/_components/forms/form-responder-client";

function serializeSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }
      continue;
    }
    params.set(key, value);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export default async function FormResponderPage({
  params,
  searchParams,
}: {
  params: { formName: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await auth();
  if (!session) {
    const callbackURL =
      `/forms/${encodeURIComponent(params.formName)}` +
      serializeSearchParams(searchParams);
    redirect(`/?callbackURL=${encodeURIComponent(callbackURL)}`);
  }

  if (!params.formName) {
    return <FormNotFound />;
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

  const { canRespond } = await api.forms.checkResponseAccess({
    formId: form.id,
  });

  if (!canRespond) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
        <Card className="max-w-md p-8 text-center">
          <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
          <h1 className="mb-2 text-2xl font-bold">
            You do not have permission to respond to this form
          </h1>
        </Card>
      </div>
    );
  }

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
      <FormResponderWrapper
        handleCallbacks={handleCallbacks}
        formName={formName}
        userName={userName}
      />
    </HydrateClient>
  );
}
