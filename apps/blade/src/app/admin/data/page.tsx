import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import MemberDemographics from "./_components/MemberDemographics";
import EventDemographics from "./_components/EventDemographics";

export const metadata: Metadata = {
  title: "Blade | Data",
  description: "View member and event demographics.",
};

export default async function Data() {
  // authentication
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const isAdmin = await api.auth.getAdminStatus();
  if (!isAdmin) {
    redirect("/");
  }

  return (
    <HydrateClient>
      <main className="container">
        <div className="mt-10 grid gap-8 md:grid-rows-2 lg:grid-cols-2">
          <div className="flex flex-col">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Member Demographics
            </h1>
            <MemberDemographics />
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Event Demographics
            </h1>
            <EventDemographics />
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
