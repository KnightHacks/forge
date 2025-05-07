import React from "react";

import AbstractRight from "./assets/abstract-left";
import Shield from "./assets/shield";
import SwordRight from "./assets/sword-left";

function RightSide() {
  return (
    <div className="fixed right-0 z-0 h-full w-1/2 scale-x-[-1]">
      <div className="bg-contact-gradient flex h-full flex-col space-y-3 sm:space-y-24">
        <SwordRight className="" />
        <AbstractRight className="" />
        <Shield className="" />
      </div>
    </div>
  );
}

export default RightSide;
