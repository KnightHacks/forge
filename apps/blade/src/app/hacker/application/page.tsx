import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api } from "~/trpc/server";
import { HackerFormPage } from "./_components/hacker-application-form";

export default async function HackerApplicationPage() {
  const session = await auth();

  if (session == null) {
    redirect(SIGN_IN_PATH);
  }

  const isHacker = await api.hacker.getHacker();

  if (isHacker) {
    return redirect(SIGN_IN_PATH);
  }

  return (
    <main className="px-8 py-4">
      <HackerFormPage />
    </main>
  );
}
