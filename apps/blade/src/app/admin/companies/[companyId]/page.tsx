import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { CompanyAdminDetail } from "~/app/_components/admin/companies/company-admin-detail";
import { canAccessCompanyAdmin, canEditCompanyAdmin } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Company Detail",
};

export default async function AdminCompanyPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const effectivePermissions = await api.roles.getPermissions();
  if (!canAccessCompanyAdmin(effectivePermissions)) {
    redirect(MEMBER_DASHBOARD_PATH);
  }
  const { companyId } = await params;
  const [detail, allCompanies] = await Promise.all([
    api.career.getAdminCompany({ companyId }).catch(() => null),
    api.career.listAdminCompanies(),
  ]);
  if (!detail) notFound();

  return (
    <CompanyAdminDetail
      allCompanies={allCompanies}
      canEdit={canEditCompanyAdmin(effectivePermissions)}
      detail={detail}
    />
  );
}
