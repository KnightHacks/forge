import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormSectionsManager } from "~/app/_components/admin/forms/form-sections-manager";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Form Sections",
};

export default async function FormSectionsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (permissions.IS_OFFICER !== true) redirect("/admin/forms");

  const initialProvisioning = await api.forms.sectionProvisioning();
  return (
    <HydrateClient>
      <FormSectionsManager initialProvisioning={initialProvisioning} />
    </HydrateClient>
  );
}
