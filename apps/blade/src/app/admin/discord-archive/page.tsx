import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { DiscordArchiveHealthDashboard } from "~/app/_components/admin/discord-archive/discord-archive-health";
import { canAccessDiscordArchive } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  description:
    "Monitor Discord archive ingestion, coverage, and reconciliation health.",
  title: "Blade | Discord Archive Health",
};

export default async function DiscordArchiveHealthPage() {
  const session = await auth();
  if (!session) redirect("/");
  const permissions = await api.roles.getPermissions();
  if (!canAccessDiscordArchive(permissions)) redirect(MEMBER_DASHBOARD_PATH);
  const health = await api.discordArchive.getHealth({ limit: 100 });

  return <DiscordArchiveHealthDashboard health={health} />;
}
