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
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@forge/ui/dropdown-menu";
import { ChevronDown, Shield } from "lucide-react";
import { getPermsAsList } from "~/lib/utils";

export async function SessionNavbar() {
  const hasCheckIn = await api.auth.hasCheckIn();
  const hasFullAdmin = await api.auth.hasFullAdmin();

  const perms = await api.roles.getPermissions();
  console.log(perms)

  let permString = ""
  Object.values(perms).forEach((v)=>{
    permString += v ? "1" : "0"
  })

  const permList = getPermsAsList(permString)

  return (
    <div className="flex items-center justify-between px-3 py-3 sm:px-10 sm:py-5">
      <Link href="/">
        <div className="flex items-center justify-center gap-x-2 text-lg font-extrabold sm:text-[2rem]">
          <ClubLogo />
        </div>
      </Link>
      <Separator className="absolute left-0 top-16 sm:top-20" />
      <NavigationMenu className="h-[35px] w-[35px]">
        <NavigationMenuList className="gap-4">
          {permList.length > 0 && <DropdownMenu>
            <DropdownMenuTrigger>
              <div tabIndex={0} className="border rounded-lg hover:bg-muted flex flex-row gap-1 w-fit px-2 py-1">
                <Shield className="size-4 my-auto mr-1"/>
                <div className="my-auto">{permList.length}</div>
                <ChevronDown className="size-4 my-auto"/>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-2">
              <h3 className="text-sm font-medium border-b p-1 pb-2">You have the following permissions:</h3>
              <ul className="list-disc px-4 max-h-48 overflow-y-auto mt-1">
                {permList.map((p) => {
                    return<li className={`p-1 text-sm text-muted-foreground`}>{p}</li>
                })}
              </ul>
            </DropdownMenuContent>
          </DropdownMenu>}
          <NavigationMenuItem className="flex items-center justify-center">
            <UserDropdown hasCheckIn={hasCheckIn} hasFullAdmin={hasFullAdmin} />
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
