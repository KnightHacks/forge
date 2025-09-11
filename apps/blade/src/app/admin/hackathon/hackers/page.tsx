import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import HackerTable from "./_components/hackers-table";
import HackerStatusCounter from "./_components/HackerStatusCounter";
import HackerScanner from "./_components/scanner";

export const metadata: Metadata = {
  title: "Blade | Hackers",
  description: "Manage Knight Hacks hackers.",
};

export default async function Hackers() {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const isAdmin = await api.auth.getAdminStatus();
  if (!isAdmin) {
    redirect("/");
  }

  const currentActiveHackathon = await api.hackathon.getCurrentHackathon();

  return (
    <HydrateClient>
      <main className="container h-screen">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="py-12">
            <h1 className="pb-4 text-center text-3xl font-extrabold tracking-tight sm:text-5xl">
              Hacker Dashboard
            </h1>
          </div>
        </div>
        <div>
          {currentActiveHackathon ? (
            <HackerStatusCounter hackathonId={currentActiveHackathon.id} />
          ) : (
            <div>No upcoming hackathon.</div>
          )}{" "}
        </div>
        <div className="mb-2 flex justify-center">
          <HackerScanner />
        </div>
        <div className="rounded-xl pb-8">
          <HackerTable />
        </div>
      </main>
    </HydrateClient>
  );
}
