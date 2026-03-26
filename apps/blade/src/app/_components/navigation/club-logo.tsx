"use client";

import Image from "next/image";

export default function ClubLogo() {
  return (
    <div className="flex items-center">
      <Image
        className="hidden dark:block"
        src="/blade-banner.svg"
        alt="Blade"
        width={0}
        height={0}
        style={{ width: "auto", height: "32px" }}
        priority
      />
      <Image
        className="block dark:hidden"
        src="/black-kh-title-logo.svg"
        alt="Blade"
        width={0}
        height={0}
        style={{ width: "auto", height: "32px" }}
        priority
      />
    </div>
  );
}
