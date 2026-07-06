import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createHackathonPortalServerCaller } from "@forge/hackathon/server";

import { auth, signIn } from "~/auth/server";
import { getKhixHackathon } from "~/lib/khix-hackathon";
import { AuthRetry } from "../_components/auth-retry";

export const metadata: Metadata = {
  title: "Knight Hacks IX | Hacker Dashboard",
  description: "Your Knight Hacks IX application dashboard.",
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

  const khix = await getKhixHackathon();
  if (!khix) redirect("/apply");

  const caller = createHackathonPortalServerCaller({
    headers: await headers(),
    session,
  });
  const dashboard = await caller.portal.getDashboard({
    hackathonName: khix.name,
  });

  if (!dashboard.participant) redirect("/apply");

  const status = dashboard.participant.status ?? "applied";

  return (
    <main className="min-h-screen bg-[#07150f] px-4 py-10 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-4xl flex-col justify-center">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#d7ff76]">
          Knight Hacks IX dashboard
        </p>
        <h1 className="mt-4 text-4xl font-black sm:text-6xl">
          Application received
        </h1>
        <p className="text-white/76 mt-5 max-w-2xl text-lg leading-8">
          Your current application status is{" "}
          <span className="font-bold text-[#d7ff76]">{status}</span>.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-full bg-[#d7ff76] px-5 py-2 font-bold text-[#0f2418]"
          >
            Back to site
          </Link>
          <Link
            href="/apply"
            className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-5 py-2 font-bold text-white"
          >
            View application
          </Link>
        </div>
      </section>
    </main>
  );
}
