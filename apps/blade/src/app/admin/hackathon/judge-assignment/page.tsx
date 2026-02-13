import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api } from "~/trpc/server";
import QRCodesClient from "~/app/_components/admin/hackathon/judge-assignment/judges-client";

export const metadata: Metadata = {
  title: "Blade | Judges",
  description: "Manage Knight Hacks Judges.",
};

export default async function Judges() {
  const session = await auth();
  if (!session) redirect(SIGN_IN_PATH);

  const hasAccess = await api.roles.hasPermission({
    or: ["IS_JUDGE"],
  });
  if (!hasAccess) redirect("/");

  return <QRCodesClient />;
}
