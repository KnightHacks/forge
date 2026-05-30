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

function NavContent({ navLinks }: NavContentProps) {
  return (
    <div className="flex h-20 items-center justify-between px-6 md:px-12 lg:px-32">
      <div className="flex items-center">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl">
          <Dargon />
        </div>
      </div>
      <div className="hidden items-center justify-center gap-8 md:flex">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="font-fredoka relative transform rounded-md px-2 py-1 text-base font-semibold uppercase tracking-wide text-white transition-all duration-500 hover:scale-110 hover:text-[#fcbc4e] lg:text-lg"
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
