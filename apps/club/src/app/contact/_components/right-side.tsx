import React from "react";

import AbstractRight from "./assets/abstract-left";
import Shield from "./assets/shield";
import SwordRight from "./assets/sword-left";

function RightSide() {
  return (
    <div className="fixed right-0 z-0 h-full w-1/2 scale-x-[-1]">
      <div className="bg-contact-gradient flex h-full flex-col space-y-11 md:space-y-28 lg:space-y-0 xl:justify-between">
        <SwordRight className="mt-[100px] w-[150px] -translate-x-[2%] transform md:w-[230px] lg:w-[270px] xl:w-[300px]" />
        <AbstractRight className="relative w-[150px] -translate-x-[47%] transform md:w-[230px] lg:w-[200px] lg:translate-y-[40%] xl:w-[250px] xl:-translate-x-[46%] xl:translate-y-[20%]" />
        <Shield className="left-0 w-[150px] md:w-[230px] lg:hidden" />
      </div>
    </div>
  );
}

export default RightSide;
