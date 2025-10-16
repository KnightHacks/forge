import type { Metadata } from "next";

import { HydrateClient } from "~/trpc/server";
import ResultsTable from "./_components/results-table";

export const metadata: Metadata = {
  title: "Blade | Hackthon Results",
  description: "Display hackathon results and judge submissions",
};

export default function ResultsDashboard() {
  return (
    <HydrateClient>
      <ResultsTable />
    </HydrateClient>
  );
}
