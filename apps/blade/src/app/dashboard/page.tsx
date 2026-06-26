import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthenticatedShell } from "~/app/_components/member/authenticated-shell";
import { DashboardClient } from "~/app/_components/member/dashboard-client";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Dashboard",
  description: "Manage your Knight Hacks member profile.",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session) redirect("/");

  return (
    <HydrateClient>
      <AuthenticatedShell session={session}>
        <DashboardClient />
      </AuthenticatedShell>
    </HydrateClient>
  );
}
