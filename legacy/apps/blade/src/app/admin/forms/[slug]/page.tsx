import { redirect } from "next/navigation";

import { appRouter } from "@forge/api";
import { auth } from "@forge/auth/server";
import { trpc } from "@forge/utils";

import { EditorClient } from "~/app/_components/admin/forms/editor/client";
import { api } from "~/trpc/server";

export default async function FormEditorPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
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
      <EditorClient
        procs={trpc.extractProcedures(appRouter)}
        slug={params.slug}
      />
    </>
  );
}
