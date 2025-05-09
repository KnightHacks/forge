import React from "react";

import AbstractLeft from "./assets/abstract-left";
import Shield from "./assets/shield";
import SwordLeft from "./assets/sword-left";

function LeftSide() {
  return (
    <div className="fixed left-0 z-0 h-full w-1/2 overflow-hidden">
      <div className="bg-contact-gradient flex h-full flex-col space-y-11">
        <SwordLeft className="mt-[100px] w-[80%] -translate-x-[2%] transform" />
        <AbstractLeft className="relative w-[80%] -translate-x-[47%] transform" />
        <Shield className="w-[80%]" />
      </div>
    </div>
  );
}

export default LeftSide;
