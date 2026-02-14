import { redirect } from "next/navigation";

import { api, HydrateClient } from "~/trpc/server";
import ResultsTable from "~/app/_components/judge/results-table";

export default async function ResultsDashboard() {
  const hasAccess = await api.roles.hasPermission({
    or: ["IS_JUDGE"],
  });
  if (!hasAccess) {
    redirect("/");
  }
  return (
    <HydrateClient>
      <ResultsTable />
    </HydrateClient>
  );
}
