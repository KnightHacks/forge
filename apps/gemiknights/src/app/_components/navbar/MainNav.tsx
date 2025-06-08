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
      className={`fixed top-0 left-0 z-50 w-full transition-opacity duration-500 ease-in-out md:backdrop-blur-md ${
        showFloating ? "md:opacity-0" : "opacity-100"
      }`}
    >
      <NavContent navLinks={navLinks} />
    </nav>
  );
}

export default MainNav;
