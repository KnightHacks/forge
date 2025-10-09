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

function NavContent({ navLinks, showGlow = false }: NavContentProps) {
  return (
    <div className="flex h-20 items-center justify-between px-6 md:px-12 lg:px-32">
      <div className="flex items-center">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl">
          {showGlow && (
            <div className="absolute inset-0 rounded-2xl bg-[#FBB03B]/30 blur-md" />
          )}
          <Dargon />
        </div>
      </div>
      <div className="hidden items-center justify-center gap-8 md:flex">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="relative transform rounded-md px-2 py-1 text-lg font-medium text-white transition hover:scale-105 hover:text-[#FBB03B]"
            {...(link.external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {showGlow && (
              <div className="absolute inset-0 rounded-md bg-[#FBB03B]/30 blur-md" />
            )}
            <span className="relative z-10">{link.label}</span>
          </a>
        ))}
      </div>
      <div className="w-12" />
    </div>
  );
}

export default NavContent;
