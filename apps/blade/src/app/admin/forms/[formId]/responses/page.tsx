import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormResponsesDashboard } from "~/app/_components/admin/forms/form-responses-dashboard";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Form Responses",
};

export default async function FormResponsesPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (
    permissions.IS_OFFICER !== true &&
    permissions.READ_FORM_RESPONSES !== true
  ) {
    redirect("/admin/forms");
  }

  const { formId } = await params;
  const [initialResponses, initialCallbacks, workspace] = await Promise.all([
    api.forms.listResponses({ formId }).catch(() => undefined),
    api.forms.listCallbackExecutions({ formId }).catch(() => undefined),
    api.forms.listAdmin().catch(() => null),
  ]);
  const initialFormName = workspace?.forms.find(
    (form) => form.id === formId,
  )?.name;

  return (
    <HydrateClient>
      <FormResponsesDashboard
        formId={formId}
        initialCallbacks={initialCallbacks}
        initialFormName={initialFormName}
        initialResponses={initialResponses}
      />
    </HydrateClient>
  );
}
