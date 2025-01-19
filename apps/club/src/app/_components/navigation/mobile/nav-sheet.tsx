import { Home, Link, Menu, Phone, Trophy, Users } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@forge/ui/sheet";

import NavLink from "../navlink";

export function NavSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Menu size={36} className="pr-2" />
      </SheetTrigger>
      <SheetContent className="bg-[#4E16B2]/40">
        <SheetHeader className="flex flex-col">
          <SheetTitle className="flex">Menu</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col justify-center">
          <ul className="flex w-full flex-col items-center gap-4 pt-4">
            <li className="flex w-full justify-center border-b pb-2 hover:text-gray-300">
              <NavLink
                linkName=""
                isActive={false}
                className="flex border-b-0 hover:border-b-0 focus:border-b-0"
              >
                <Home className="pr-2" />
                Home
              </NavLink>
            </li>
            <li className="flex w-full justify-center border-b pb-2 hover:text-gray-300">
              <NavLink
                linkName="hackathons"
                isActive={false}
                className="flex border-b-0 hover:border-b-0 focus:border-b-0"
              >
                <Trophy className="pr-2" />
                Hackathons
              </NavLink>
            </li>
            <li className="flex w-full justify-center border-b pb-2 hover:text-gray-300">
              <NavLink
                linkName="contact"
                isActive={false}
                className="flex border-b-0 hover:border-b-0 focus:border-b-0"
              >
                <Phone className="pr-2" />
                Contact
              </NavLink>
            </li>
            <li className="flex w-full justify-center border-b pb-2 hover:text-gray-300">
              <NavLink
                isActive={false}
                linkName="teams"
                className="flex border-b-0 hover:border-b-0 focus:border-b-0"
              >
                <Users className="pr-2" />
                Teams
              </NavLink>
            </li>
            <li className="flex w-full justify-center pb-2 hover:text-gray-300">
              <NavLink
                linkName="links"
                isActive={false}
                className="flex border-b-0 hover:border-b-0 focus:border-b-0"
              >
                <Link className="pr-2" />
                Links
              </NavLink>
            </li>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
