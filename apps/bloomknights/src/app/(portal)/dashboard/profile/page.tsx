import type { Metadata } from "next";

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
      <section className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-[#173b28]/20 bg-[#fffaf0] text-[#173b28] shadow-[0_24px_70px_rgba(12,52,29,0.18)]">
        <div className="border-b border-[#173b28]/15 bg-[#e4ebcf] p-5 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8f285f]">
            Participant record
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
            Your hacker profile
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#405c4a]">
            Keep the details attached to your BloomKnights application current.
            Required fields are marked with an asterisk.
          </p>
        </div>
        <div className="p-5 sm:p-8">
          <HackerProfileForm />
        </div>
      </section>
    </BloomKnightsDashboardShell>
  );
}
