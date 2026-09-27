import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormResponsesDashboard } from "~/app/_components/admin/forms/form-responses-dashboard";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

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
  const [responses, callbacks, workspace, callbackCatalog] = await Promise.all([
    api.forms
      .listResponses({ formId })
      .then((data) => ({ data, error: null }))
      .catch((cause: unknown) => ({
        data: null,
        error:
          cause instanceof Error
            ? cause.message
            : "Responses could not be loaded.",
      })),
    api.forms.listCallbackExecutions({ formId }).catch(() => null),
    api.forms.listAdmin().catch(() => null),
    api.forms.listCallbacks().catch(() => []),
  ]);
  const formName = workspace?.forms.find((form) => form.id === formId)?.name;

  return (
    <FormResponsesDashboard
      callbacks={callbacks}
      callbackCatalog={callbackCatalog}
      formId={formId}
      formName={formName}
      responses={responses.data}
      responsesError={responses.error}
    />
  );
}
