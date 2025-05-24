import React from 'react';
import NavContent from './NavContent';

interface NavLink {
  href: string;
  label: string;
}

interface MainNavProps {
  navLinks: NavLink[];
  showFloating?: boolean;
}

function MainNav({ navLinks, showFloating }: MainNavProps) {
  return (
    <nav className={`fixed top-0 left-0 w-full z-50 md:backdrop-blur-md transition-all duration-300 ease-in-out ${
      showFloating ? 'md:opacity-0 md:-translate-y-full' : 'opacity-100 translate-y-0'
    }`}>
      <NavContent navLinks={navLinks} />
    </nav>
  );
}

export default MainNav; 