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
    <div className="flex h-16 sm:h-18 md:h-20 items-center justify-between px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-32">
      <div className="flex items-center">
        <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 items-center justify-center rounded-2xl">
          {showGlow && (
            <div className="absolute inset-0 rounded-2xl bg-[#FBB03B]/30 blur-md" />
          )}
          <Image
            src="/KH2025Small.svg"
            alt="Knight Hacks 2025 Logo"
            width={48}
            height={48}
            className="relative z-10 h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 object-contain"
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </div>
      </div>
      <div className="hidden items-center gap-4 sm:gap-6 md:gap-8 lg:flex">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="relative rounded-md px-2 py-1 text-base sm:text-lg md:text-xl font-medium text-white transition-colors duration-200 hover:text-[#FBB03B]"
          >
            {showGlow && (
              <div className="absolute inset-0 rounded-md bg-[#FBB03B]/30 blur-md" />
            )}
            <span className="relative z-10">{link.label}</span>
          </a>
        ))}
      </div>
      <div className="w-[80px] sm:w-[90px] md:w-[110px]" />
    </div>
  );
}

export default NavContent;
