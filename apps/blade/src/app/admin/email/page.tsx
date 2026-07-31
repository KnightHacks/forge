import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import type { EmailPortalTab } from "~/app/_components/admin/email/email-portal-workspace";
import { EmailPortalAdmin } from "~/app/_components/admin/email/email-portal-admin";
import { env } from "~/env";
import { canAccessEmailPortal } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  description:
    "Create Knight Hacks email campaigns and check their delivery status.",
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
    // 100 is the schema maximum. The domain filter counts templates from this
    // list, so a cap below the real total makes a filter button read "0" while
    // matching templates exist just past it.
    api.email.listTemplates({ includeArchived: false, limit: 100 }),
    api.email.listSends({ limit: 50 }),
    api.email.listAudienceOptions(),
  ]);
  const tab = parseTab((await searchParams).tab);

  return (
    <EmailPortalAdmin
      audienceOptions={audienceOptions}
      campaignAudienceMode={
        env.NODE_ENV === "development" && env.BLADE_E2E_AUTH !== "true"
          ? "development_review"
          : "all"
      }
      initialTab={tab}
      sends={sends}
      templates={templates}
    />
  );
}
