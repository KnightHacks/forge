import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@forge/ui/button";

import { auth, signIn } from "~/auth/server";
import { AuthRetry } from "../../_components/auth-retry";
import { BloomKnightsDashboardShell } from "../../_components/bloomknights-dashboard-shell";
import { HackerProfileForm } from "../../_components/hacker-profile-form";
import { PortalHeader } from "../../_components/portal-header";

export const metadata: Metadata = {
  title: "BloomKnights | Hacker Profile",
};

export default async function HackerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  const session = await auth();
  const { authError } = await searchParams;
  if (!session) {
    if (authError) return <AuthRetry callbackPath="/dashboard/profile" />;
    signIn("discord", { redirectTo: "/dashboard/profile" });
  }

  return (
    <BloomKnightsDashboardShell>
      <PortalHeader />
      <section className="mx-auto max-w-3xl rounded-[2rem] bg-[#FFFDF1]/95 p-6 text-[#42602A] shadow-xl sm:p-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#f384d4]">
              BloomKnights
            </p>
            <h1 className="text-3xl font-black">Hacker profile</h1>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
        <HackerProfileForm />
      </section>
    </BloomKnightsDashboardShell>
  );
}
