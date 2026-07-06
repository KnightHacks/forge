import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createHackathonPortalServerCaller } from "@forge/hackathon/server";

import { auth, signIn } from "~/auth/server";
import { getKhixHackathon } from "~/lib/khix-hackathon";
import { HackerFormPage } from "../_components/application/hacker-application-form";
import { AuthRetry } from "../_components/auth-retry";

export const metadata: Metadata = {
  title: "Knight Hacks IX | Hacker Application",
  description: "Apply to hack at Knight Hacks IX.",
};

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  const session = await auth();
  const { authError } = await searchParams;
  if (!session) {
    if (authError) return <AuthRetry callbackPath="/apply" />;
    signIn("discord", { redirectTo: "/apply" });
  }

  const khix = await getKhixHackathon();
  if (!khix) notFound();

  const caller = createHackathonPortalServerCaller({
    headers: await headers(),
    session,
  });
  const dashboard = await caller.portal.getDashboard({
    hackathonName: khix.name,
  });

  if (dashboard.participant) redirect("/dashboard");

  const now = new Date();
  if (
    now < khix.hackathon.applicationOpen ||
    now > khix.hackathon.applicationDeadline
  ) {
    const beforeOpen = now < khix.hackathon.applicationOpen;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07150f] bg-[url('https://assets.knighthacks.org/khix-flat.webp')] bg-cover bg-center px-4 py-10 text-white">
        <section className="bg-[#07150f]/82 w-full max-w-xl rounded-lg border border-white/20 p-8 shadow-2xl backdrop-blur-md">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#d7ff76]">
            Knight Hacks IX applications
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Applications are {beforeOpen ? "not open yet" : "closed"}.
          </h1>
          <p className="text-white/78 mt-4 leading-7">
            {beforeOpen
              ? `Applications open ${khix.hackathon.applicationOpen.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "America/New_York" })}.`
              : "Join the Knight Hacks Discord for future event and registration updates."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#d7ff76] px-5 py-2 font-bold text-[#0f2418]"
          >
            Back to Knight Hacks IX
          </Link>
        </section>
      </main>
    );
  }

  return (
    <HackerFormPage
      applicationBackgroundKey={
        khix.hackathon.applicationBackgroundEnabled
          ? khix.hackathon.applicationBackgroundKey
          : "khix"
      }
      hackathonId={khix.name}
      hackathonName={khix.hackathon.displayName}
      hackathonStartDate={khix.hackathon.startDate.toISOString()}
    />
  );
}
