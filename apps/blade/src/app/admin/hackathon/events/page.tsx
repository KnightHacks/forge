import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import { AddPoints } from "~/app/_components/shared/AddPoints";
import ScannerPopUp from "~/app/_components/shared/scanner";
import { EventsTable } from "~/app/_components/admin/hackathon/events/events-table";

export default async function HackathonEvents() {
  // Check if the user is authenticated
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const hasAccess = await api.roles.hasPermission({
    or: ["READ_HACK_EVENT", "EDIT_HACK_EVENT"],
  });

  if (!hasAccess) {
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
            <div className="mb-2 flex flex-col justify-center gap-2 sm:flex-row">
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
