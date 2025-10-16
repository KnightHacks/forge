import { redirect } from "next/navigation";

import { api } from "~/trpc/server";

export default async function Page() {
  const isJudge = await api.auth.getJudgeStatus();
  const isAdmin = await api.auth.getAdminStatus();

  if (!isJudge && !isAdmin) {
    redirect("/");
  }

  redirect("/judge/dashboard");
}
