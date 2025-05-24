'use client';

import { useState, useEffect } from 'react';
import MainNav from './navbar/MainNav';
import FloatingNav from './navbar/FloatingNav';
import MLHBadge from './navbar/MLHBadge';

const NAV_LINKS = [
  { href: '#about', label: 'About' },
  { href: '#tracks', label: 'Tracks' },
  { href: '#sponsors', label: 'Sponsors' },
  { href: '#faqs', label: `FAQ's` },
];

const Navbar = () => {
  const [showFloating, setShowFloating] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowFloating(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <MainNav navLinks={NAV_LINKS} />
      <FloatingNav navLinks={NAV_LINKS} show={showFloating} />
      <MLHBadge showFloating={showFloating} />
    </>
  );
};

export default Navbar;
