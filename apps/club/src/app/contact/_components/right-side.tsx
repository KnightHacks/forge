import React from "react";

import AbstractRight from "./assets/abstract-left";
import Shield from "./assets/shield";
import SwordRight from "./assets/sword-left";

function RightSide() {
  return (
    <div className="fixed right-0 z-0 h-full w-1/2 scale-x-[-1]">
      <div className="bg-contact-gradient flex h-full flex-col space-y-11">
        <SwordRight className="mt-[100px] w-[80%] -translate-x-[2%] transform" />
        <AbstractRight className="relative w-[80%] -translate-x-[47%] transform" />
        <Shield className="left-0 w-[80%]" />
      </div>
    </div>
  );
}

export default RightSide;
