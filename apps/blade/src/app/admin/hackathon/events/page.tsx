import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import { AddPoints } from "../../_components/AddPoints";
import ScannerPopUp from "../../club/members/_components/scanner";
import { EventsTable } from "./_components/events-table";

export const metadata: Metadata = {
  title: "Blade Hackathon Events",
  description: "Manage Knight Hacks hackathon events.",
};

export default async function HackathonEvents() {
  // Check if the user is authenticated
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  // Check if the user has access to Events
  const hasFullAdmin = await api.auth.hasFullAdmin();

  if (!hasFullAdmin) {
    redirect("/");
  }

  return (
    <HydrateClient>
      <main className="container h-screen">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="py-12">
            <h1 className="pb-4 text-center text-3xl font-extrabold tracking-tight sm:text-5xl">
              Hackathon Events Dashboard
            </h1>
            <div className="mb-2 flex flex-row justify-center gap-2">
              <ScannerPopUp eventType="Hacker" />
              <AddPoints type="Hacker" />
            </div>
          </div>
        </div>
        <div className="rounded-xl pb-8">
          <EventsTable />
        </div>
      </main>
    </HydrateClient>
  );
}

