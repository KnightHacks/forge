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
      <main className="flex min-h-screen items-center justify-center bg-[#f3eadb] px-5 text-center text-[#42602A]">
        <section className="max-w-xl rounded-[2rem] bg-[#FFFDF1] p-8 shadow-xl">
          <h1 className="text-3xl font-black">
            Applications are {beforeOpen ? "not open yet" : "closed"}.
          </h1>
          <p className="mt-3 text-[#53634A]">
            Visit your dashboard for the latest BloomKnights status and
            announcements.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-full bg-[#f384d4] px-6 py-3 font-black text-white"
          >
            Go to dashboard
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
