import React from 'react';
import NavContent from './NavContent';

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
      <NavContent navLinks={navLinks} showGlow={true} />
    </nav>
  );
}

export default FloatingNav; 