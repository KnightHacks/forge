import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import ResultsTable from "./_components/results-table";

export const metadata: Metadata = {
  title: "Blade | Hackthon Results",
  description: "Display hackathon results and judge submissions",
};

export default async function Hackers() {
  const session = await auth();
  if (!session) redirect(SIGN_IN_PATH);

  const isAdmin = await api.auth.getAdminStatus();
  if (!isAdmin) redirect("/");

  return (
    <HydrateClient>
      <ResultsTable />
    </HydrateClient>
  );
}
