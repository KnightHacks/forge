import React from "react";

import AbstractRight from "./assets/abstract-left";
import Shield from "./assets/shield";
import SwordRight from "./assets/sword-left";

function RightSide() {
  return (
    <div className="fixed right-0 z-0 h-full w-1/2 scale-x-[-1]">
      <div className="bg-contact-gradient flex h-full flex-col space-y-11 md:space-y-28 lg:space-y-28">
        <SwordRight className="mt-[100px] w-[150px] -translate-x-[2%] transform md:w-[230px] lg:w-[300px]" />
        <AbstractRight className="relative w-[150px] -translate-x-[47%] transform md:w-[230px] lg:w-[300px]" />
        <Shield className="left-0 w-[150px] md:w-[230px] lg:w-[300px]" />
      </div>
    </div>
  );
}

export default RightSide;
