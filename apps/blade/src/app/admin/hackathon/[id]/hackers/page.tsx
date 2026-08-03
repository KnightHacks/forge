import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { HackerRoster } from "~/app/_components/admin/hackathon/hackers/hacker-roster";
import { canAccessHackathonAdmin } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Hackers",
};

export default async function AdminHackerRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (!canAccessHackathonAdmin(permissions)) redirect(MEMBER_DASHBOARD_PATH);

  const { id } = await params;

  // Both codes are a bad id in the URL, not a server fault: `hackathonId` is
  // `z.string().uuid()`, so a truncated paste fails input parsing before the
  // resolver runs and never reaches NOT_FOUND.
  const [detail, roster, counts] = await Promise.all([
    api.hackathon.get({ id }).catch((error: unknown) => {
      if (
        error instanceof TRPCError &&
        (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")
      ) {
        notFound();
      }
      throw error;
    }),
    api.hacker.listForHackathon({ hackathonId: id }).catch(() => ({
      hackers: [],
    })),
    api.hacker.statusCounts({ hackathonId: id }).catch(() => ({
      byStatus: {},
      total: 0,
    })),
  ]);

  return (
    <HackerRoster
      hackathon={detail.hackathon}
      initialCounts={counts}
      initialHackers={roster.hackers}
      isConfigured={detail.isConfigured}
    />
  );
}
