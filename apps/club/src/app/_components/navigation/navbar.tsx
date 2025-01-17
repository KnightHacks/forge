"use client";

import { useState } from "react";

import DesktopNavbar from "./nav/desktop";
import MobileNavbar from "./nav/mobile-navbar";

const Navbar = () => {
  const [mobileNavbar, setMobileNavbar] = useState(false);

  return (
    <>
      <header className="w-full">
        <div className="hidden md:block">
          <DesktopNavbar />
        </div>

        <div className="block md:hidden">
          <MobileNavbar
            toggleMobileNavbar={setMobileNavbar}
            mobileNavbar={mobileNavbar}
          />
        </div>
      </header>
    </>
  );
};

export default Navbar;
