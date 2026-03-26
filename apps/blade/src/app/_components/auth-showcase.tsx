import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { api } from "~/trpc/server";
import { Hero } from "./hero";
import ClubLogo from "./navigation/club-logo";

export async function Auth() {
  const session = await auth();
  await api.auth.getAdminStatus();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen w-full">
      <div className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-border/60 bg-background/80 px-3 py-3 backdrop-blur-md sm:px-10 sm:py-4">
        <div className="flex items-center gap-x-2 text-lg font-extrabold sm:text-[1.6rem]">
          <ClubLogo />
        </div>
      </div>
      <Hero />
    </div>
  );
}
