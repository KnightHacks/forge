import React from "react";

import AbstractLeft from "./assets/abstract-left";
import Shield from "./assets/shield";
import SwordLeft from "./assets/sword-left";

function LeftSide() {
  return (
    <div className="fixed left-0 z-0 h-full w-1/2 overflow-hidden">
      <div className="bg-contact-gradient flex h-full flex-col space-y-11 md:space-y-28 lg:space-y-0 xl:justify-between">
        <SwordLeft className="mt-[100px] w-[150px] -translate-x-[2%] transform md:w-[230px] lg:w-[270px] xl:w-[300px]" />
        <AbstractLeft className="w-[150px] -translate-x-[47%] transform md:w-[230px] lg:w-[200px] lg:translate-y-[50%] xl:w-[250px] xl:-translate-x-[46%] xl:translate-y-[20%]" />
        <Shield className="w-[150px] bg-slate-100 md:w-[230px] lg:hidden xl:w-[270px]" />
      </div>
    </div>
  );
}

export default LeftSide;
