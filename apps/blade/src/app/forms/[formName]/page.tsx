import { redirect } from "next/navigation";

import { appRouter } from "@forge/api";
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
        formField: string;
      }[]) {
        data[map.procField] = response[map.formField];
      }

      const route = procs[con.proc]?.route.split(".");
      if (!Array.isArray(route) || route.length < 2) continue;
      const [routerName, procName] = route as [keyof typeof api, string];
      const subroute = api[routerName];
      const proc = (
        subroute as Record<string, (input: unknown) => Promise<unknown>>
      )[procName];
      if (!proc) continue;

      await proc(data);
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
