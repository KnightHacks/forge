import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { HackathonCheckInWorkspace } from "~/app/_components/admin/hackathon-events/hackathon-check-in-workspace";
import { canAccessHackathonCheckIn } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Admit hackers and record hackathon event attendance.",
  title: "Blade | Hackathon Check-in",
};

export default async function AdminHackathonCheckInPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (!canAccessHackathonCheckIn(permissions)) redirect(MEMBER_DASHBOARD_PATH);

  return <HackathonCheckInWorkspace />;
}
