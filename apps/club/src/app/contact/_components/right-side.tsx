import React from "react";

import AbstractRight from "./assets/abstract-left";
import Shield from "./assets/shield";
import SwordRight from "./assets/sword-left";

function RightSide() {
  return (
    <div className="fixed right-0 z-0 h-full w-1/2 scale-x-[-1]">
      <div className="bg-contact-gradient flex h-full flex-col justify-between">
        <SwordRight className="seWidth:w-[120px] seOnly:mt-[100px] iPadMini:w-[200px] mt-[140px] w-[150px] -translate-x-[2%] transform md:w-[230px] lg:w-[270px] xl:w-[300px]" />
        <AbstractRight className="seWidth:w-[130px] iPadMini:w-[200px] iPadPro:w-[300px] iPadPro:translate-y-0 relative w-[150px] -translate-x-[47%] transform md:w-[250px] md:-translate-x-[35%] lg:w-[200px] lg:translate-y-[40%] xl:w-[250px] xl:-translate-x-[46%] xl:translate-y-[20%] 2xl:translate-y-[40%]" />
        <Shield className="seOnly:mb-10 seWidth:w-[100px] iPadMini:w-[150px] iPadPro:block tall:mb-32 taller:mb-40 left-0 mb-7 w-[150px] md:mb-20 md:w-[200px] lg:hidden" />
      </div>
    </div>
  );
}

export default RightSide;
