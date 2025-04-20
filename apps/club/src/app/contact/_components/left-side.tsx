import React from "react";

import AbstractLeft from "./assets/abstract-left";
import Shield from "./assets/shield";
import SwordLeft from "./assets/sword-left";

function LeftSide() {
  return (
    <div className="flex flex-col">
      <SwordLeft className="w-[500px]" />

      {/* <AbstractLeft className="w-[220px] -translate-x-[70px] -translate-y-[400px]" />

      <Shield className="- w-[130px] -translate-y-[400px]" /> */}
    </div>
  );
}

export default LeftSide;
