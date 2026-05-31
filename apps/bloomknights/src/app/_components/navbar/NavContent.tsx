import React from "react";

import Dargon from "../graphics/dargon";

interface NavLink {
  href: string;
  label: string;
  external?: boolean;
}

interface NavContentProps {
  navLinks: NavLink[];
  showGlow?: boolean;
}

const scrolledLinkGlow: React.CSSProperties = {
  textShadow:
    "0 0 8px rgba(56, 142, 70, 1), 0 0 18px rgba(34, 139, 64, 0.9), 0 0 34px rgba(17, 104, 45, 0.78), 0 0 56px rgba(9, 72, 32, 0.58), 0 1px 8px rgba(5, 42, 19, 0.65)",
};

function NavContent({ navLinks, showGlow = false }: NavContentProps) {
  return (
    <div className="flex h-20 items-center justify-between px-6 md:px-12 lg:px-32">
      <div className="flex items-center">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-500 hover:scale-110">
          <Dargon />
        </div>
      </div>
      <div className="hidden items-center justify-center gap-8 md:flex">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="wc-nav-link rounded-md px-2 py-1 text-base transition-[color,text-shadow,transform] duration-500 lg:text-lg"
            style={showGlow ? scrolledLinkGlow : undefined}
            {...(link.external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            <span className="relative z-10">{link.label}</span>
          </a>
        ))}
      </div>
      <div className="w-12" />
    </div>
  );
}

export default NavContent;
