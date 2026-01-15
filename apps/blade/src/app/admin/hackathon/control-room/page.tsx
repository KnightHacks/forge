import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { api, HydrateClient } from "~/trpc/server";
import ControlRoomClient from "./_components/control-room-client";

export default async function ControlRoom() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const isOfficer = await api.roles.hasPermission({and: ["IS_OFFICER"]});
  if (!isOfficer) {
    redirect("/");
  }

  return (
    <HydrateClient>
      <ControlRoomClient />
    </HydrateClient>
  );
}
