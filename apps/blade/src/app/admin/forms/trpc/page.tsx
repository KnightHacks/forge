import type { FormType } from "@forge/consts/knight-hacks";
import { appRouter } from "@forge/api";

import { extractProcedures } from "~/lib/utils";
import { api } from "~/trpc/server";
import ListMatcher from "./_components/picker";

export default async function Page() {
  const forms = await api.forms.getAllForms();
  const allForms = Object.fromEntries(
    forms.map((form) => [
      form.slugName,
      {
        questions: (form.formData as FormType).questions.map((q) => q.question),
        id: form.id,
      },
    ]),
  );

  return <ListMatcher procs={extractProcedures(appRouter)} forms={allForms} />;
}
