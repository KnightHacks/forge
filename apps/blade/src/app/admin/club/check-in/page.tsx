import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import { CheckInPage } from "./_components/check-in-page";

export const metadata: Metadata = {
  title: "Blade | Club Check-in",
  description: "Check-in members for club events.",
};

export default async function ClubCheckIn() {
  // Check if the user is authenticated
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  // Check if the user has access to Blade
  const isAdmin = await api.auth.getAdminStatus();
  if (!isAdmin) {
    redirect("/");
  }

  return (
    <HydrateClient>
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="text-center">
            <h1 className="pb-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Club Check-in
            </h1>
            <p className="text-muted-foreground">
              Check-in members for club events using QR scanner or manual entry
            </p>
          </div>
          <CheckInPage />
        </div>
      </main>
    </HydrateClient>
  );
}
