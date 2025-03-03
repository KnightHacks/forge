import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { auth } from "@forge/auth";
import { Button } from "@forge/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@forge/ui/navigation-menu";
import { Separator } from "@forge/ui/separator";

import { USER_DROPDOWN_ICON_SIZE } from "~/consts";
import { api } from "~/trpc/server";
import { Hero } from "./hero";
import ClubLogo from "./navigation/club-logo";
import { UserDropdown } from "./navigation/user-dropdown";

export async function Auth() {
  const session = await auth();
  const isAdmin = await api.auth.getAdminStatus();

  let member;

  if (session) {
    member = await api.member.getMember();
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-full w-full">
        <div className="absolute left-0 top-0 z-50 flex w-full items-center justify-between px-3 py-3 sm:px-10 sm:py-5">
          <div className="flex w-full items-center justify-start gap-x-2 text-lg font-extrabold sm:text-[2rem]">
            <ClubLogo />
          </div>
          {session && (
            <NavigationMenu className="h-[35px] w-[35px]">
              <NavigationMenuList>
                <NavigationMenuItem className="flex items-center justify-center">
                  <UserDropdown memberExists={!!member} isAdmin={isAdmin} />
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          )}
        </div>
        <Separator className="absolute top-16 sm:top-20" />
        {!session ? (
          <Hero />
        ) : (
          <div className="mt-28 flex h-full w-full flex-col items-center px-2 sm:mt-0 sm:justify-center">
            <h1 className="w-full break-words text-center text-3xl font-extrabold leading-tight tracking-tight sm:text-[3rem]">
              Welcome to Blade!
            </h1>
            <p className="text-md mb-5 text-center tracking-tighter sm:text-lg">
              Manage your Knight Hacks membership, hackathon information, and
              more with <b>Blade</b>.
            </p>
            <Link href={"/dashboard"}>
              <Button size="lg">
                <LayoutDashboard
                  color={"#fff"}
                  size={USER_DROPDOWN_ICON_SIZE}
                />{" "}
                <span className="ml-1">Open Dashboard</span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
