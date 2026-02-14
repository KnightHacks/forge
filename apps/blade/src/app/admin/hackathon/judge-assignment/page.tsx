import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api } from "~/trpc/server";
import QRCodesClient from "~/app/_components/admin/hackathon/judge-assignment/judges-client";

export default async function Judges() {
  const session = await auth();
  if (!session) redirect(SIGN_IN_PATH);

  const hasAccess = await api.roles.hasPermission({
    or: ["IS_JUDGE"],
  });
  if (!hasAccess) redirect("/");

  return <QRCodesClient />;
}
