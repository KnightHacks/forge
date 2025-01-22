"use client";

import DesktopNavbar from "./mobile/desktop";
import MobileNavbar from "./mobile/mobile-navbar";

const Navbar = () => {
  return (
    <>
      <header className="w-full">
        <DesktopNavbar />
        <MobileNavbar />
      </header>
    </>
  );
};

export default Navbar;
