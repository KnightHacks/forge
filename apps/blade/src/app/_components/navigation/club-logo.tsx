"use client";

import Image from "next/image";

export default function ClubLogo() {
  return (
    <div className="flex items-center gap-2">
      <Image
        className="hidden dark:block"
        src={"/white-kh-logo.svg"}
        alt="The logo of Knight Hacks"
        width={0}
        height={0}
        style={{ width: "35px", height: "35px" }}
      />
      <Image
        className="block dark:hidden"
        src={"/black-kh-logo.svg"}
        alt="The logo of Knight Hacks"
        width={0}
        height={0}
        style={{ width: "35px", height: "35px" }}
      />
      <div>Blade</div>
    </div>
  );
}
