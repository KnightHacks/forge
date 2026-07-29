import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { EventCheckInPage } from "~/app/_components/admin/events/event-check-in-page";
import { canAccessEventCheckIn } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Check Knight Hacks members into a club event.",
  title: "Blade | Event Check-in",
};

export default async function AdminCheckInPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (!canAccessEventCheckIn(permissions)) redirect(MEMBER_DASHBOARD_PATH);

  const groups = await api.event.listCheckInEvents({ olderSearch: "" });

  return <EventCheckInPage groups={groups} />;
}
