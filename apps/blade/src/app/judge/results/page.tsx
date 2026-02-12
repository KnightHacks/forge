import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { api, HydrateClient } from "~/trpc/server";
import ResultsTable from "./_components/results-table";

export const metadata: Metadata = {
  title: "Blade | Hackathon Results",
  description: "Display hackathon results",
};

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
