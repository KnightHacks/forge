import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { canAccessMemberAdmin } from "~/app/_components/admin/access";
import { CompanyAdminDetail } from "~/app/_components/admin/members/company-admin-detail";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

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
  if (!canAccessMemberAdmin(effectivePermissions)) {
    redirect(MEMBER_DASHBOARD_PATH);
  }
  const { companyId } = await params;
  const [detail, allCompanies] = await Promise.all([
    api.career.getAdminCompany({ companyId }).catch(() => null),
    api.career.listAdminCompanies(),
  ]);
  if (!detail) notFound();

  return (
    <HydrateClient>
      <CompanyAdminDetail
        allCompanies={allCompanies}
        canEdit={
          effectivePermissions.IS_OFFICER === true ||
          effectivePermissions.EDIT_MEMBERS === true
        }
        detail={detail}
      />
    </HydrateClient>
  );
}
