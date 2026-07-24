import { redirect } from "next/navigation";

export default async function AdminCompanyPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  redirect(`/admin/companies/${companyId}`);
}
