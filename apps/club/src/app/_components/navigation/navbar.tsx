"use client";

import DesktopNavbar from "./mobile/desktop";
import MobileNavbar from "./mobile/mobile-navbar";

const Navbar = () => {
  return (
    <>
      <header className="z-10 w-full">
        <DesktopNavbar />
        <MobileNavbar />
      </header>
    </>
  );
};

export default Navbar;
