"use client";

import Image from "next/image";
import { useTheme } from "next-themes";

export default function ClubLogo() {
  const { theme } = useTheme();
  console.log(theme);

  const imageUrl =
    theme === "dark" ? "/white-kh-logo.svg" : "/black-kh-logo.svg";

  return (
    <>
      <Image
        src={imageUrl}
        alt="The logo of Knight Hacks"
        width={0}
        height={0}
        style={{ width: "35px", height: "35px" }}
      />
      <div>Blade</div>
    </>
  );
}
