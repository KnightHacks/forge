import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { appRouter } from "@forge/api";
import { auth } from "@forge/auth/server";

import { extractProcedures } from "~/lib/utils";
import { api } from "~/trpc/server";
import { EditorClient } from "./client";

export const metadata: Metadata = {
  title: "Blade | Edit Form",
  description: "Edit Form.",
};

export default async function FormEditorPage({
  params,
}: {
  params: { slug: string };
}) {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const hasBasicAccess = await api.roles.hasPermission({
    or: ["EDIT_FORMS"],
  });
  if (!hasBasicAccess) {
    redirect("/dashboard");
  }

  const accessCheck = await api.forms.checkFormEditAccess({
    slug_name: params.slug,
  });

  if (accessCheck.canEdit === false) {
    redirect("/admin/forms");
  }

  return (
    <>
      <EditorClient procs={extractProcedures(appRouter)} slug={params.slug} />
    </>
  );
}
