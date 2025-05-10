import React from "react";

import AbstractLeft from "./assets/abstract-left";
import Shield from "./assets/shield";
import SwordLeft from "./assets/sword-left";

function LeftSide() {
  return (
    <div className="fixed left-0 z-0 h-full w-1/2 overflow-hidden">
      <div className="bg-contact-gradient flex h-full flex-col justify-between">
        <SwordLeft className="seOnly:mt-[100px] seWidth:w-[120px] iPadMini:w-[200px] mt-[140px] w-[150px] -translate-x-[2%] transform md:w-[230px] lg:w-[270px] xl:w-[300px]" />
        <AbstractLeft className="seWidth:w-[130px] iPadMini:w-[200px] iPadPro:translate-y-0 iPadPro:w-[300px] w-[150px] -translate-x-[47%] transform md:w-[250px] md:-translate-x-[30%] lg:w-[200px] lg:translate-y-[50%] xl:w-[250px] xl:-translate-x-[46%] xl:translate-y-[20%] 2xl:translate-y-[40%]" />
        <Shield className="seOnly:mb-10 seWidth:w-[100px] tall:mb-32 taller:mb-40 iPadMini:w-[150px] iPadPro:block mb-7 w-[150px] md:mb-20 md:w-[200px] lg:hidden xl:w-[270px]" />
      </div>
    </div>
  );
}

export default LeftSide;
