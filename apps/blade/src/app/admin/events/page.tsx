import { redirect } from "next/navigation";
import { and, gte, lt } from "drizzle-orm/expressions";

import { auth } from "@forge/auth";
import { db } from "@forge/db/client";
import { Event } from "@forge/db/schemas/knight-hacks";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import { EventsTable } from "./_components/events-table";

export default async function Events() {
  // Check if the user is authenticated
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  // Grab all events occurring in the next 7 days
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const events = await db
    .select()
    .from(Event)
    .where(
      and(gte(Event.start_datetime, today), lt(Event.start_datetime, nextWeek)),
    );

  console.log(events);

  // Check if the user has access to Blade
  const isAdmin = await api.auth.getAdminStatus();
  if (!isAdmin) {
    redirect("/");
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
