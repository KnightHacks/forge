'use client';

import { useState, useEffect } from 'react';

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

  // Main nav bar (static on mobile, fixed on desktop)
  const MainNav = (
    <nav className="top-0 left-0 w-full z-50 md:fixed">
      <div className="backdrop-blur-md bg-auto h-20 flex items-center px-6 md:px-12 lg:px-32 justify-between">
        <div className="flex items-center">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center">
            <img
              src="/KH2025Small.svg"
              alt="Knight Hacks 2025 Logo"
              className="h-12 w-12 object-contain"
              style={{ filter: 'brightness(0) invert(1)' }} // white logo
            />
          </div>
        </div>
        <div className="hidden md:flex gap-8 items-center">
          {NAV_LINKS.map(link => (
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

  // Floating nav bar (appears on scroll, desktop only)
  const FloatingNav = (
    <nav
      className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 ease-in-out hidden md:block ${
        showFloating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
      }`}
    >
      <div className="backdrop-blur-md bg-black/10 shadow-lg h-20 flex items-center px-12 lg:px-32 justify-between">
        <div className="flex items-center">
          <div className="h-12 w-12 bg-[#ffce80]/50 rounded-2xl shadow-md flex items-center justify-center">
            <span className="text-[#D63434] text-2xl font-extrabold">KH</span>
          </div>
        </div>
        <div className="flex gap-8 items-center">
          {NAV_LINKS.map(link => (
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

  // MLH badge (always fixed top right)
  const MLHBadge = (
    <div
      className={`fixed right-4 top-0 z-[10000] transition-all duration-300 ease-in-out`}
      style={{ maxWidth: '100px', minWidth: '60px', width: '10vw' }}
    >
      <a
        id="mlh-trust-badge"
        className="block"
        href="https://mlh.io/na?utm_source=na-hackathon&utm_medium=TrustBadge&utm_campaign=2026-season&utm_content=white"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          src="https://s3.amazonaws.com/logged-assets/trust-badge/2026/mlh-trust-badge-2026-white.svg"
          alt="Major League Hacking 2026 Hackathon Season"
          className="w-full"
        />
      </a>
    </div>
  );

  return (
    <>
      {MainNav}
      {FloatingNav}
      {MLHBadge}
    </>
  );
};

export default Navbar;
