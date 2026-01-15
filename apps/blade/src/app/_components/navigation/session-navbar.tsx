import Link from "next/link";
import { ChevronDown, Shield } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@forge/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@forge/ui/navigation-menu";
import { Separator } from "@forge/ui/separator";

import { getPermsAsList } from "~/lib/utils";
import { api } from "~/trpc/server";
import ClubLogo from "./club-logo";
import { UserDropdown } from "./user-dropdown";

export async function SessionNavbar() {
  const perms = await api.roles.getPermissions();

  let permString = "";
  Object.values(perms).forEach((v) => {
    permString += v ? "1" : "0";
  });

  const permList = getPermsAsList(permString);

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
          {permList.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div
                  tabIndex={0}
                  className="flex w-fit flex-row gap-1 rounded-lg border px-2 py-1 hover:bg-muted"
                >
                  <Shield className="my-auto mr-1 size-4" />
                  <div className="my-auto">{permList.length}</div>
                  <ChevronDown className="my-auto size-4" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="p-2">
                <h3 className="border-b p-1 pb-2 text-sm font-medium">
                  You have the following permissions:
                </h3>
                <ul className="mt-1 max-h-48 list-disc overflow-y-auto px-4">
                  {permList.map((p, index) => {
                    return (
                      <li
                        key={index}
                        className={`p-1 text-sm text-muted-foreground`}
                      >
                        {p}
                      </li>
                    );
                  })}
                </ul>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <NavigationMenuItem className="flex items-center justify-center">
            <UserDropdown permissions={perms} />
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
