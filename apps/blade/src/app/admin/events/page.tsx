import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { isDiscordAdmin } from "~/app/utils";
import { SIGN_IN_PATH } from "~/consts";
import { HydrateClient } from "~/trpc/server";
import { EventsTable } from "./_components/events-table";

export default async function Events() {
  // Check if the user is authenticated
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  // Check if the user has access to Blade
  const isAdmin = await isDiscordAdmin(session.user);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  return (
    <HydrateClient>
      <main className="container h-screen">
        <div className="flex flex-col items-center justify-center gap-4">
          <h1 className="py-12 text-center text-3xl font-extrabold tracking-tight sm:text-5xl">
            Events Dashboard
          </h1>
        </div>
        <div className="rounded-xl pb-8">
          <EventsTable />
        </div>
      </main>
    </HydrateClient>
  );
}
