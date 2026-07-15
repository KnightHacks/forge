import type { Metadata } from "next";

import { FormSectionsManager } from "~/app/_components/admin/forms/form-sections-manager";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Form Sections",
};

export default function FormSectionsPage() {
  void api.forms.sectionProvisioning.prefetch();
  return (
    <HydrateClient>
      <FormSectionsManager />
    </HydrateClient>
  );
}
