import React from "react";

import NavContent from "./NavContent";

interface NavLink {
  href: string;
  label: string;
}

interface FloatingNavProps {
  navLinks: NavLink[];
  show: boolean;
}

function FloatingNav({ navLinks, show }: FloatingNavProps) {
  return (
    <nav
      className={`fixed left-0 top-0 z-40 hidden w-full transition-opacity duration-1000 ease-in-out md:block ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      <NavContent navLinks={navLinks} showGlow={true} />
    </nav>
  );
}

export default FloatingNav;
