import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Link as IconLink, Trophy, Users } from "lucide-react";

import NavLink from "../navlink";

export default function DesktopNavbar() {
  const pathName = usePathname();
  return (
    <div className="fixed z-50 flex w-full justify-center">
      <div className="mt-5 hidden w-5/6 items-center justify-between rounded-full border border-violet-600 bg-[#4E16B2]/40 px-2 py-2 backdrop-blur-lg md:flex md:w-3/5">
        <a href={"/"}>
          <Image
            src={"/kh-logo.svg"}
            alt="Kh-logo"
            loading="eager"
            width={150}
            height={150}
            className="p-3"
          />
        </a>
        <div className="mx-10 flex items-center justify-center space-x-5">
          <div className="flex items-center p-2 text-center font-sans text-lg font-bold text-white hover:text-gray-300">
            <NavLink
              linkName=""
              isActive={pathName.endsWith("/")}
              className="flex"
            >
              <Home className="pr-2" />
              Home
            </NavLink>
          </div>
          <div className="flex items-center p-2 text-center font-sans text-lg font-bold text-white hover:text-gray-300">
            <NavLink
              linkName="officers"
              isActive={pathName.endsWith("officers")}
              className="flex"
            >
              <Users className="pr-2" />
              Officers
            </NavLink>
          </div>
          <div className="flex items-center p-2 text-center font-sans text-lg font-bold text-white hover:text-gray-300">
            <NavLink
              linkName="teams"
              isActive={pathName.endsWith("teams")}
              className="flex border-transparent"
            >
              <Trophy className="pr-2" />
              Teams
            </NavLink>
          </div>
          <div className="flex items-center p-2 text-center font-sans text-lg font-bold text-white hover:text-gray-300">
            <NavLink
              linkName="hackathons"
              isActive={pathName.endsWith("hackathons")}
              className="flex"
            >
              <IconLink className="pr-2" />
              Hackathons
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}
