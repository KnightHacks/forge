import type { Metadata } from "next";

import { auth, signIn } from "~/auth/server";
import { AuthRetry } from "../_components/auth-retry";
import { BloomDashboard } from "../_components/bloom-dashboard";
import { BloomKnightsDashboardShell } from "../_components/bloomknights-dashboard-shell";
import { PortalHeader } from "../_components/portal-header";

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
    if (authError) return <AuthRetry callbackPath="/dashboard" />;
    signIn("discord", { redirectTo: "/dashboard" });
  }

  return (
    <BloomKnightsDashboardShell>
      <PortalHeader />
      <BloomDashboard />
    </BloomKnightsDashboardShell>
  );
}
