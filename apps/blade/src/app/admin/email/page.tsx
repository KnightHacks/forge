import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import type { EmailPortalTab } from "~/app/_components/admin/email/email-portal-workspace";
import { canAccessEmailPortal } from "~/app/_components/admin/access";
import { EmailPortalAdmin } from "~/app/_components/admin/email/email-portal-admin";
import { env } from "~/env";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Build, schedule, and reconcile Knight Hacks email campaigns.",
  title: "Blade | Email Portal",
};

function parseTab(value: string | string[] | undefined): EmailPortalTab {
  const tab = Array.isArray(value) ? value[0] : value;
  return tab === "templates" || tab === "sends" ? tab : "compose";
}

export default async function EmailPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (!canAccessEmailPortal(permissions)) redirect(MEMBER_DASHBOARD_PATH);

  const [templates, sends, audienceOptions] = await Promise.all([
    api.email.listTemplates({ includeArchived: false, limit: 50 }),
    api.email.listSends({ limit: 50 }),
    api.email.listAudienceOptions(),
  ]);
  const tab = parseTab((await searchParams).tab);

  return (
    <HydrateClient>
      <EmailPortalAdmin
        campaignAudienceMode={
          env.NODE_ENV === "development" && env.BLADE_E2E_AUTH !== "true"
            ? "team_only"
            : "all"
        }
        initialAudienceOptions={audienceOptions}
        initialSends={sends}
        initialTab={tab}
        initialTemplates={templates}
      />
    </HydrateClient>
  );
}
