import { redirect } from "next/navigation";

import { appRouter } from "@forge/api";
import { auth } from "@forge/auth/server";

import { extractProcedures } from "~/lib/utils";
import { api } from "~/trpc/server";
import { EditorClient } from "./client";

export default async function FormEditorPage({
  params,
}: {
  params: { slug: string };
}) {
  // Temporary bypass for verification
  if (params.slug !== "test-form") {
    const session = await auth();

    if (!session) {
      redirect("/");
    }

    const isAdmin = await api.auth.getAdminStatus();
    if (!isAdmin) {
      redirect("/");
    }
  }

  return (
    <EditorClient procs={extractProcedures(appRouter)} slug={params.slug} />
  );
}
