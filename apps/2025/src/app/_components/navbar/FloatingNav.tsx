import React from 'react';
import Image from "next/image";

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
      className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 ease-in-out hidden md:block ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
      }`}
    >
      <div className="backdrop-blur-md bg-black/10 shadow-lg h-20 flex items-center px-12 lg:px-32 justify-between">
        <div className="flex items-center">
          <div className="h-12 w-12 bg-[#ffce80]/50 rounded-2xl shadow-md flex items-center justify-center">
            <Image
              src="https://s3.amazonaws.com/logged-assets/trust-badge/2026/mlh-trust-badge-2026-white.svg"
              alt="Major League Hacking 2026 Hackathon Season"
              width={100}
              height={100}
              className="w-full"
            />
          </div>
        </div>
        <div className="flex gap-8 items-center">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="text-[#ffce80] text-lg font-medium transition-colors duration-200 px-2 py-1 rounded-md hover:bg-[#ffffff22]"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="w-[110px]" />
      </div>
    </nav>
  );
}

export default FloatingNav; 