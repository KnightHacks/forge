import type { AnyTRPCProcedure, AnyTRPCRouter } from "@trpc/server";

import { appRouter } from "@forge/api";
import { FormType } from "@forge/consts/knight-hacks";

import { api } from "~/trpc/server";
import ListMatcher from "./_components/picker";

export interface ProcedureMeta {
  inputSchema: string[];
  route: string;
}

function extractProcedures(router: AnyTRPCRouter) {
  const procedures: Record<string, ProcedureMeta> = {};

  for (const [procKey, proc] of Object.entries(router._def.procedures)) {
    const procTyped = proc as AnyTRPCProcedure;

    if (
      !procTyped._def.meta ||
      !procTyped._def.meta.inputSchema ||
      !procTyped._def.meta.id
    )
      continue;

    procedures[procTyped._def.meta.id] = {
      inputSchema: Object.keys(procTyped._def.meta.inputSchema.shape),
      route: procKey,
    };
  }

  return procedures;
}

export default async function Page() {
  /**
   * const allMetadata = extractProcedures(appRouter);
   *console.log(allMetadata);
   *Object.values(allMetadata).forEach((meta) => {
   *  console.log(Object.keys(meta.inputSchema.shape));
   *});
   *console.log(await api["companies"]["getCompanies"].call());
   */

	const forms = await api.forms.getAllForms();
	const allForms = Object.fromEntries(forms.map(
		(form) => [
			form.slugName,
			{ questions: (form.formData as FormType).questions.map(q => q.question), id: form.id },
		],
	));

  return (
    <>
      <ListMatcher procs={extractProcedures(appRouter)} forms={allForms} />
    </>
  );
}
