import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";

interface IssuePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function IssuePage({ params }: IssuePageProps) {
  const session = await auth();
  if (!session) redirect(SIGN_IN_PATH);

  const { id } = await params;
  redirect(`/admin/issues/${id}`);
}
