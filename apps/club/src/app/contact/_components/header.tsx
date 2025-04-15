"use client";

import React from "react";

// import AbstractLeft from "./assets/abstract-left";
// import AbstractRight from "./assets/abstract-right";
// import Shield from "./assets/shield";
// import SwordLeft from "./assets/sword-left";
// import SwordRight from "./assets/sword-right";

function Header() {
  return (
    //style later contact us will flicker and make contact us larger
    <div className="flex flex-col items-center justify-center bg-black">
      <div>Contact Us</div>
      <div>To get in touch with KnightHacks, please fill out the following</div>
      <div> form and a member of our team will get back to you soon:</div>
    </div>
  );
}

export default Header;
