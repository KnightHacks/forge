import React from "react";
import NavContent from "./NavContent";

interface NavLink {
  href: string;
  label: string;
}

interface MainNavProps {
  navLinks: NavLink[];
  showFloating?: boolean;
}

function MainNav({ navLinks, showFloating }: MainNavProps) {
  return (
    <nav
      className={`fixed top-0 left-0 z-50 w-full transition-all duration-300 ease-in-out md:backdrop-blur-md ${
        showFloating
          ? "md:-translate-y-full md:opacity-0"
          : "translate-y-0 opacity-100"
      }`}
    >
      <NavContent navLinks={navLinks} />
    </nav>
  );
}

export default MainNav;
