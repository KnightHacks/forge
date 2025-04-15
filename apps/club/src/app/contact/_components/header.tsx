"use client";

import React from "react";

// import AbstractLeft from "./assets/abstract-left";
// import AbstractRight from "./assets/abstract-right";
// import Shield from "./assets/shield";
// import SwordLeft from "./assets/sword-left";
// import SwordRight from "./assets/sword-right";

function Header() {
  return (
    // add font later until someone greenlights adding font to font folder/tailwind config
    <div className="font-narrow flex flex-col items-center justify-center">
      <div>Contact Us</div>
      <div>To get in touch with KnightHacks, please fill out the following</div>
      <div> form and a member of our team will get back to you soon:</div>
    </div>
  );
}

export default Header;
