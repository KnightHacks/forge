import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@forge/db/client";

import { auth, signIn } from "~/auth/server";
import { HackerFormPage } from "../_components/application/hacker-application-form";
import { AuthRetry } from "../_components/auth-retry";

export const metadata: Metadata = {
  title: "BloomKnights | Hacker Application",
  description: "Apply to hack at BloomKnights.",
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

  const hackathon = await db.query.Hackathon.findFirst({
    where: (table, { eq }) => eq(table.name, "bloomknights"),
  });
  if (!hackathon) notFound();

  const now = new Date();
  if (now < hackathon.applicationOpen || now > hackathon.applicationDeadline) {
    const beforeOpen = now < hackathon.applicationOpen;
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#173b28] px-4 py-10 text-[#173b28]">
        <section className="w-full max-w-xl rounded-2xl border border-[#173b28]/20 bg-[#fffaf0] p-6 text-left shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8f285f]">
            BloomKnights applications
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
            Applications are {beforeOpen ? "not open yet" : "closed"}.
          </h1>
          <p className="mt-3 max-w-md font-medium leading-7 text-[#526658]">
            {beforeOpen
              ? `Applications open ${hackathon.applicationOpen.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "America/New_York" })}.`
              : "Join the Knight Hacks Discord for future event and registration updates."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[#8f285f] px-5 py-2 font-black text-white transition-colors hover:bg-[#75204f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8f285f]/25"
          >
            Back to BloomKnights
          </Link>
        </section>
      </main>
    );
  }

  return (
    <HackerFormPage
      applicationBackgroundKey={
        hackathon.applicationBackgroundEnabled
          ? hackathon.applicationBackgroundKey
          : "bloomknights"
      }
      hackathonId="bloomknights"
      hackathonName={hackathon.displayName}
      hackathonStartDate={hackathon.startDate.toISOString()}
    />
  );
}
