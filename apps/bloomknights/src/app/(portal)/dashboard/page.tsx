import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createHackathonPortalServerCaller } from "@forge/hackathon/server";

import { auth, signIn } from "~/auth/server";
import { AuthRetry } from "../_components/auth-retry";
import { BloomDashboard } from "../_components/bloom-dashboard";

export const metadata: Metadata = {
  title: "BloomKnights | Hacker Dashboard",
  description: "Your BloomKnights application and event dashboard.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  const session = await auth();
  const { authError } = await searchParams;
  if (!session) {
    if (authError) {
      return <AuthRetry callbackPath="/dashboard" withShell={false} />;
    }
    signIn("discord", { redirectTo: "/dashboard" });
  }

  const caller = createHackathonPortalServerCaller({
    headers: await headers(),
    session,
  });
  const dashboard = await caller.portal.getDashboard({
    hackathonName: "bloomknights",
  });

  if (!dashboard.participant) redirect("/apply");

  return <BloomDashboard />;
}
