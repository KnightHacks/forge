"use client";

import Image from "next/image";
import {
  ChevronDown,
  Home,
  Link,
  Menu,
  Phone,
  Trophy,
  Users,
} from "lucide-react";

import NavLink from "../navlink";

export default function MobileNavbar({
  toggleMobileNavbar,
  mobileNavbar,
}: {
  toggleMobileNavbar: (state: boolean) => void;
  mobileNavbar: boolean;
}) {
  return (
    <div className="flex justify-center">
      <div
        className={`relative mt-5 flex w-5/6 flex-col items-center border border-violet-600 bg-[#4E16B2] bg-opacity-90 px-2 py-2 backdrop-blur-lg md:w-3/5 ${
          mobileNavbar ? "rounded-none" : "rounded-full"
        }`}
      >
        {/* Row containing the logo and toggle button */}
        <div className="flex w-full items-center justify-between">
          <Image
            src={"/kh-logo.svg"}
            alt="Kh-logo"
            width={150}
            height={150}
            className="p-3"
          />
          <button
            className="mx-5"
            onClick={() => toggleMobileNavbar(!mobileNavbar)}
          >
            {!mobileNavbar ? <Menu size={36} /> : <ChevronDown size={36} />}
          </button>
        </div>
        {/* Menu below the row */}
        {mobileNavbar && (
          <ul className="flex w-full flex-col items-center gap-4 pt-4">
            <li className="flex w-full justify-center border-b pb-2 hover:text-gray-300">
              <NavLink
                linkName="home"
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
        )}
      </div>
    </div>
  );
}
