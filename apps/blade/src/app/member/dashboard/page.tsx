import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthenticatedShell } from "~/app/_components/member/authenticated-shell";
import { DashboardClient } from "~/app/_components/member/dashboard-client";
import { getMemberDebugLatencyMs } from "~/app/_components/member/debug-latency";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Member Dashboard",
  description: "Manage your Knight Hacks member profile.",
};

export default async function MemberDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();

  if (!session) redirect("/");

  const debugLatencyMs = getMemberDebugLatencyMs(await searchParams);

  return (
    <HydrateClient>
      <AuthenticatedShell session={session}>
        <DashboardClient debugLatencyMs={debugLatencyMs} />
      </AuthenticatedShell>
    </HydrateClient>
  );
}
