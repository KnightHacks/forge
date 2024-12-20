import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api } from "~/trpc/server";
import { MemberApplicationForm } from "./_components/member-application-form";

export default async function MemberApplicationPage() {
  const session = await auth();

  if (session == null) {
    redirect(SIGN_IN_PATH);
  }

  const isMember = await api.member.getMember();

  if (isMember) {
    return redirect("/member/dashboard");
  }

  return (
    <main className="px-8 py-4">
      <MemberApplicationForm />
    </main>
  );
}
