import React from "react";
import Image from "next/image";

interface NavLink {
  href: string;
  label: string;
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
          <Image
            src="/KH2025Small.svg"
            alt="Knight Hacks 2025 Logo"
            width={48}
            height={48}
            className="relative z-10 h-12 w-12 object-contain"
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </div>
      </div>
      <div className="hidden items-center gap-8 md:flex">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="relative rounded-md px-2 py-1 text-lg font-medium text-white transition-colors duration-200 hover:text-[#FBB03B]"
          >
            {showGlow && (
              <div className="absolute inset-0 rounded-md bg-[#FBB03B]/30 blur-md" />
            )}
            <span className="relative z-10">{link.label}</span>
          </a>
        ))}
      </div>
      <div className="w-[110px]" />
    </div>
  );
}

export default NavContent;
