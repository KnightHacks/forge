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
      <main className="font-dm-sans flex min-h-screen items-center justify-center bg-[#f5ebd5] bg-[url('https://assets.knighthacks.org/bloom-background-desktop.webp')] bg-cover bg-center px-4 py-10 text-[#3d2e1e]">
        <section className="bk-portal-panel w-full max-w-xl p-6 text-left sm:p-9">
          <p className="bk-portal-kicker">BloomKnights applications</p>
          <h1 className="bk-portal-heading mt-2 text-3xl sm:text-4xl">
            Applications are {beforeOpen ? "not open yet" : "closed"}.
          </h1>
          <p className="mt-3 max-w-md font-medium leading-7 text-[#5a4535]">
            {beforeOpen
              ? `Applications open ${hackathon.applicationOpen.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "America/New_York" })}.`
              : "Join the Knight Hacks Discord for future event and registration updates."}
          </p>
          <Link
            href="/"
            className="bk-portal-button mt-6 inline-flex min-h-11 items-center px-5 py-2"
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
