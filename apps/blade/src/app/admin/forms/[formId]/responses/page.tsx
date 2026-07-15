import type { Metadata } from "next";

import { FormResponsesDashboard } from "~/app/_components/admin/forms/form-responses-dashboard";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Form Responses",
};

export default async function FormResponsesPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  void api.forms.listResponses.prefetch({ formId });
  void api.forms.listCallbackExecutions.prefetch({ formId });

  return (
    <HydrateClient>
      <FormResponsesDashboard formId={formId} />
    </HydrateClient>
  );
}
