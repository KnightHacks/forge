import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { api, HydrateClient } from "~/trpc/server";
import ControlRoomClient from "./_components/control-room-client";

export const metadata: Metadata = {
  title: "Blade | Hackathon Control-Room",
  description: "Control room for current hackathon",
};

export default async function ControlRoom() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const hasAccess = await api.roles.hasPermission({ and: ["IS_OFFICER"] });
  if (!hasAccess) {
    redirect("/");
  }

  return (
    <HydrateClient>
      <ControlRoomClient />
    </HydrateClient>
  );
}
