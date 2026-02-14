import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { CheckInPage } from "~/app/_components/admin/club/check-in/check-in-page";
import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";

export default async function HackathonCheckIn() {
  // Check if the user is authenticated
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const hasAccess = await api.roles.hasPermission({
    or: ["CHECKIN_CLUB_EVENT"],
  });
  if (!hasAccess) {
    redirect("/");
  }

  return (
    <HydrateClient>
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="text-center">
            <h1 className="pb-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Hackathon Check-in
            </h1>
            <p className="text-muted-foreground">
              Check-in hackers and members for hackathon events using QR scanner
              or manual entry
            </p>
          </div>
          <CheckInPage />
        </div>
      </main>
    </HydrateClient>
  );
}
