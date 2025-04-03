import Link from "next/link";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@forge/ui/navigation-menu";
import { Separator } from "@forge/ui/separator";

import { api } from "~/trpc/server";
import ClubLogo from "./club-logo";
import { UserDropdown } from "./user-dropdown";

export async function SessionNavbar() {
  const isAdmin = await api.auth.getAdminStatus();

  return (
    <div className="flex items-center justify-between px-3 py-3 sm:px-10 sm:py-5">
      <Link href="/">
        <div className="flex items-center justify-center gap-x-2 text-lg font-extrabold sm:text-[2rem]">
          <ClubLogo />
        </div>
      </Link>
      <Separator className="absolute left-0 top-16 sm:top-20" />
      <NavigationMenu className="h-[35px] w-[35px]">
        <NavigationMenuList>
          <NavigationMenuItem className="flex items-center justify-center">
            <UserDropdown isAdmin={isAdmin} />
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
