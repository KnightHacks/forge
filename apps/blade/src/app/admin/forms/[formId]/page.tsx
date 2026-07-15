import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { formDefinitionSchema } from "@forge/validators";

import { AdminFormBuilder } from "~/app/_components/admin/forms/admin-form-builder";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Edit Form",
};

export default async function EditFormPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");
  const { formId } = await params;
  const [result, workspace, callbacks, respondentRoles] = await Promise.all([
    api.forms.getAdminForm({ formId }),
    api.forms.listAdmin(),
    api.forms.listCallbacks(),
    api.forms.listRespondentRoles(),
  ]);
  const definition = formDefinitionSchema.parse(result.form.formData);

  return (
    <HydrateClient>
      <AdminFormBuilder
        callbacks={callbacks}
        configuredCallbacks={result.callbacks}
        initial={{
          closesAt: result.form.closesAt?.toISOString() ?? null,
          definition,
          duesOnly: result.form.duesOnly,
          id: result.form.id,
          manuallyClosed: result.form.manuallyClosed,
          name: result.form.name,
          opensAt: result.form.opensAt?.toISOString() ?? null,
          responseMode: result.form.responseMode,
          revision: result.form.revision,
          respondentRoleIds: result.respondentRoleIds,
          sectionId: result.form.sectionId,
          slugName: result.form.slugName,
          state: result.form.state,
        }}
        readOnly={!result.access.canEdit}
        respondentRoles={respondentRoles}
        sections={workspace.sections}
      />
    </HydrateClient>
  );
}
