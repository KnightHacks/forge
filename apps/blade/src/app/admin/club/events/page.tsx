import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import { AddPoints } from "../../_components/AddPoints";
import ScannerPopUp from "../members/_components/scanner";
import { EventsTable } from "./_components/events-table";

export default async function Events() {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const hasAccess = await api.roles.hasPermission({
    or: ["EDIT_CLUB_EVENT", "READ_CLUB_EVENT"],
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
              Club Events Dashboard
            </h1>
            <div className="mb-2 flex flex-col justify-center gap-2 sm:flex-row">
              <ScannerPopUp eventType="Member" />
              <AddPoints type="Member" />
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
