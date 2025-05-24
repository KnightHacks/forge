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
      className={`fixed top-0 left-0 z-40 hidden w-full transition-all duration-300 ease-in-out md:block ${
        show ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`}
    >
      <NavContent navLinks={navLinks} showGlow={true} />
    </nav>
  );
}

export default FloatingNav;
