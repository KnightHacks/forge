import { auth } from "@forge/auth";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@forge/ui/navigation-menu";
import { Separator } from "@forge/ui/separator";

import { api } from "~/trpc/server";
import { AuthHome } from "./auth-home";
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
        {!session ? <Hero /> : <AuthHome />}
      </div>
    </div>
  );
}
