import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { HackathonList } from "~/app/_components/admin/hackathon/hackathon-list";
import { canAccessHackathonAdmin } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Hackathons",
};

export default async function AdminHackathonPage() {
  const session = await auth();
  if (!session) redirect("/");

  // Checked before the list is awaited, so a non-officer never has hackathon
  // configuration on the wire.
  const permissions = await api.roles.getPermissions();
  if (!canAccessHackathonAdmin(permissions)) redirect(MEMBER_DASHBOARD_PATH);

  const hackathons = await api.hackathon.list();

  return <HackathonList hackathons={hackathons} />;
}
