import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { EmailDash } from "~/app/_components/emailDash";
import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";

export default async function AdminEmail() {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const hasCheckIn = await api.roles.hasPermission({
    and: ["CHECKIN_CLUB_EVENT", "CHECKIN_HACK_EVENT"],
  });
  const hasFullAdmin = await api.roles.hasPermission({ and: ["IS_OFFICER"] });

  if (!hasCheckIn && !hasFullAdmin) {
    redirect("/");
  }

  const user = await api.member.getMember();
  if (!user) {
    redirect("/");
  }

  return (
    <HydrateClient>
      <EmailDash />
    </HydrateClient>
  );
}
