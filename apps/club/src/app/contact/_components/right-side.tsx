import React from "react";

import AbstractRight from "./assets/abstract-left";
import Shield from "./assets/shield";
import SwordRight from "./assets/sword-left";

function RightSide() {
  return (
    <div className="fixed right-0 z-0 h-full w-1/2 scale-x-[-1]">
      <div className="bg-contact-gradient flex h-full flex-col space-y-3 sm:space-y-24">
        <SwordRight className="seOnly:mt-24 bg-slate mt-20 -translate-x-[3.2rem] scale-[2.5]" />
        <AbstractRight className="-translate-x-[5.4rem] scale-[0.8] sm:scale-[1]" />
        <Shield className="-translate-x-14 scale-[0.5] sm:scale-[0.60]" />
      </div>
    </div>
  );
}

export default RightSide;
