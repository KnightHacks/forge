import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { CompanyAdminDashboard } from "~/app/_components/admin/companies/company-admin-dashboard";
import { canAccessMemberAdmin } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Company Admin",
  description: "Review Guild companies and member work histories.",
};

export default async function AdminCompaniesPage() {
  const session = await auth();
  if (!session) redirect("/");

  const effectivePermissions = await api.roles.getPermissions();
  if (!canAccessMemberAdmin(effectivePermissions)) {
    redirect(MEMBER_DASHBOARD_PATH);
  }

  const companies = await api.career.listAdminCompanies();
  return (
    <HydrateClient>
      <CompanyAdminDashboard companies={companies} />
    </HydrateClient>
  );
}
