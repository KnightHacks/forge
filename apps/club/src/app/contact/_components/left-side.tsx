import React from "react";

import AbstractLeft from "./assets/abstract-left";
import Shield from "./assets/shield";
import SwordLeft from "./assets/sword-left";

function LeftSide() {
  return (
    <div className="fixed left-0 z-0 h-full w-1/2 bg-slate-500">
      <div className="flex h-full flex-col space-y-3 sm:mr-40 sm:space-y-24 md:space-y-20">
        <SwordLeft className="mt-40 bg-slate-200" />
        {/* <AbstractLeft className="mt-64 bg-slate-300" /> */}
        <Shield className="bg-slate-600" />
      </div>
    </div>
  );
}

export default LeftSide;
