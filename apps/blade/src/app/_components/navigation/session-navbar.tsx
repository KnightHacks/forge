import Image from "next/image";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@forge/ui/navigation-menu";
import { Separator } from "@forge/ui/separator";

import { UserDropdown } from "./user-dropdown";

export function SessionNavbar() {
  return (
    <div className="flex items-center justify-between px-3 py-3 sm:px-10 sm:py-5">
      <div className="flex items-center justify-center gap-x-2 text-lg font-extrabold sm:text-[2rem]">
        <Image
          src={"/gold-kh-logo.svg"}
          alt="The logo of Knight Hacks"
          width={0}
          height={0}
          style={{ width: "35px", height: "35px" }}
        />
        Blade
      </div>
      <Separator className="absolute left-0 top-16 sm:top-20" />
      <NavigationMenu className="h-[35px] w-[35px]">
        <NavigationMenuList>
          <NavigationMenuItem className="flex items-center justify-center">
            <UserDropdown />
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
