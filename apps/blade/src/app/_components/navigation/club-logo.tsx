"use client";

import Image from "next/image";
import { useTheme } from "next-themes";

export default function ClubLogo() {
  const { theme } = useTheme();

  let imageURL;
  if (theme == "dark") {
    imageURL = "/white-kh-logo.svg";
  } else if (theme == "light") {
    imageURL = "/black-kh-logo.svg";
  } else {
    // Get system theme
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    imageURL =
      systemTheme === "dark" ? "/white-kh-logo.svg" : "/black-kh-logo.svg";
  }

  return (
    <>
      <Image
        src={imageURL}
        alt="The logo of Knight Hacks"
        width={0}
        height={0}
        style={{ width: "35px", height: "35px" }}
      />
      <div>Blade</div>
    </>
  );
}
