import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { HackathonDetail } from "~/app/_components/admin/hackathon/hackathon-detail";
import { canAccessHackathonAdmin } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Hackathon",
};

export default async function AdminHackathonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (!canAccessHackathonAdmin(permissions)) redirect(MEMBER_DASHBOARD_PATH);

  const { id } = await params;

  // Independent reads, so they run together — awaiting them in sequence
  // doubled the time the officer stares at an unchanged screen.
  const [detail, templates] = await Promise.all([
    api.hackathon.get({ id }).catch((error: unknown) => {
      // A bad id in the URL is a 404, not a 500. Any other failure still throws.
      //
      // BAD_REQUEST counts as bad: `hackathonIdSchema` is `z.string().uuid()`,
      // so a truncated paste or a stale bookmark fails input parsing before the
      // resolver runs and never reaches NOT_FOUND. Matching only NOT_FOUND sent
      // `/admin/hackathon/abc` to the error boundary instead of the 404 page.
      if (
        error instanceof TRPCError &&
        (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")
      ) {
        notFound();
      }
      throw error;
    }),
    // Only hackathon-domain templates can back status mail, so the picker is
    // filtered at the source rather than in the component.
    api.email.listTemplates({
      domain: "hackathon",
      includeArchived: false,
      limit: 100,
    }),
  ]);

  return <HackathonDetail detail={detail} templates={templates} />;
}
