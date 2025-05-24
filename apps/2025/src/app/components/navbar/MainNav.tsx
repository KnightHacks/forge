import React from 'react';

interface NavLink {
  href: string;
  label: string;
}

interface MainNavProps {
  navLinks: NavLink[];
}

function MainNav({ navLinks }: MainNavProps) {
  return (
    <nav className="top-0 left-0 w-full z-50 md:fixed">
      <div className="backdrop-blur-md bg-auto h-20 flex items-center px-6 md:px-12 lg:px-32 justify-between">
        <div className="flex items-center">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center">
            <img
              src="/KH2025Small.svg"
              alt="Knight Hacks 2025 Logo"
              className="h-12 w-12 object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
        </div>
        <div className="hidden md:flex gap-8 items-center">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="text-white text-lg font-medium hover:text-[#FBB03B] transition-colors duration-200 px-2 py-1 rounded-md"
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

export default MainNav; 