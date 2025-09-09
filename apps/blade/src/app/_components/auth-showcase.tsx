import { redirect } from "next/navigation";

import { auth } from "@forge/auth";
import { Separator } from "@forge/ui/separator";

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
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-full w-full">
        <div className="absolute left-0 top-0 z-50 flex w-full items-center justify-between px-3 py-3 sm:px-10 sm:py-5">
          <div className="flex w-full items-center justify-start gap-x-2 text-lg font-extrabold sm:text-[2rem]">
            <ClubLogo />
          </div>
        </div>
        <Separator className="absolute top-16 sm:top-20" />
        <Hero />
      </div>
    </div>
  );
}
