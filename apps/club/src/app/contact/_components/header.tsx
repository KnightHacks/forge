"use client";

import React from "react";

function Header() {
  return (
    //style later contact us will flicker and make contact us larger
    <div className="flex w-full flex-col items-center justify-center tracking-wider">
      <div className="mb-4 text-2xl font-bold lg:mb-6 lg:text-4xl">
        Contact Us
      </div>
      {/* IPhone SE and iPhone12 pro because width messing up formatting */}
      <div className="seOnly:block mb-1 hidden text-xs font-bold">
        To get in touch with KnightHacks,
      </div>
      <div className="seOnly:block mb-1 hidden text-xs font-bold">
        please fill out the following form and
      </div>
      <div className="seOnly:block mb-3 hidden text-xs font-bold">
        a member of our team will get back to you soon:
      </div>
      {/* Anythilng larger than width 390px */}
      <div className="seOnly:hidden mb-1 text-sm font-bold tracking-wider lg:text-2xl">
        To get in touch with KnightHacks, please fill out the following
      </div>
      <div className="seOnly:hidden mb-6 text-sm font-bold tracking-wider lg:text-2xl">
        form and a member of our team will get back to you soon:
      </div>
    </div>
  );
}

export default Header;
