"use client";

import DesktopNavbar from "./mobile/desktop";
import MobileNavbar from "./mobile/mobile-navbar";

const Navbar = () => {
  return (
    <>
      <header className="w-full">
        <div className="hidden md:block">
          <DesktopNavbar />
        </div>

        <div className="block md:hidden">
          <MobileNavbar />
        </div>
      </header>
    </>
  );
};

export default Navbar;
