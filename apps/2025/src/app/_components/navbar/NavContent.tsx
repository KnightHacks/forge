import React from 'react';
import Image from 'next/image';

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
    <div className="h-20 flex items-center px-6 md:px-12 lg:px-32 justify-between">
      <div className="flex items-center">
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center relative">
          {showGlow && <div className="absolute inset-0 bg-[#FBB03B]/30 blur-md rounded-2xl" />}
          <Image
            src="/KH2025Small.svg"
            alt="Knight Hacks 2025 Logo"
            width={48}
            height={48}
            className="h-12 w-12 object-contain relative z-10"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>
      </div>
      <div className="hidden md:flex gap-8 items-center">
        {navLinks.map(link => (
          <a
            key={link.href}
            href={link.href}
            className="text-white text-lg font-medium hover:text-[#FBB03B] transition-colors duration-200 px-2 py-1 rounded-md relative"
          >
            {showGlow && <div className="absolute inset-0 bg-[#FBB03B]/30 blur-md rounded-md" />}
            <span className="relative z-10">{link.label}</span>
          </a>
        ))}
      </div>
      <div className="w-[110px]" />
    </div>
  );
}

export default NavContent; 