import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminFormBuilder } from "~/app/_components/admin/forms/admin-form-builder";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Create Form",
};

export default async function CreateFormPage() {
  const session = await auth();
  if (!session) redirect("/");
  const [workspace, callbacks, permissions, respondentRoles] =
    await Promise.all([
      api.forms.listAdmin(),
      api.forms.listCallbacks(),
      api.roles.getPermissions(),
      api.forms.listRespondentRoles(),
    ]);
  if (!permissions.IS_OFFICER && !permissions.EDIT_FORMS) {
    redirect("/admin/forms");
  }

  return (
    <HydrateClient>
      <AdminFormBuilder
        callbacks={callbacks}
        respondentRoles={respondentRoles}
        sections={workspace.sections}
      />
    </HydrateClient>
  );
}
