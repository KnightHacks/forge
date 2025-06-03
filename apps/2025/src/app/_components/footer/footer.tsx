import Image from "next/image";
import Link from "next/link";
import { Bebas_Neue } from "next/font/google";

const footerSVG = "./khFull.svg";
const shadow = "./shadow.svg";
const mlhcoc = "https://mlh.io/code-of-conduct";
const sponsor = "https://blade.knighthacks.org/sponsor";
const contact = "mailto:hack@knighthacks.org";
const hackersGuide = "https://knighthacks.org/hackers-guide";
const bn = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export default function Footer() {
  return (
    <div className="mx-auto flex flex-col items-center">
      <div className="relative w-full">
        <Image
          src={shadow}
          alt="Shadow"
          width={0}
          height={0}
          sizes="100vw"
          objectFit="cover"
          className="absolute bottom-0 left-1/2 mb-10 w-full -translate-x-1/2 opacity-75"
        />
        <Image
          src={footerSVG}
          alt="Knight Hacks Logo"
          width={2267}
          height={803}
          objectFit="cover"
          className="absolute bottom-0 left-1/2 mb-20 w-1/3 -translate-x-1/2"
        />
      </div>
      <div
        className={`${bn.className} -mt-10 flex w-full flex-col justify-center bg-black pt-15 pb-5 text-white`}
      >
        <div className="mb-3 flex justify-center px-2 text-center text-lg sm:text-xl md:text-3xl lg:text-4xl">
          <Link
            href={mlhcoc}
            className="flex transform px-3 transition hover:scale-105 hover:underline"
          >
            MLH code of conduct{" "}
          </Link>
          |
          <Link
            href={sponsor}
            className="flex transform px-3 transition hover:scale-105 hover:underline"
          >
            {" "}
            sponsor us{" "}
          </Link>
          |
          <Link
            href={contact}
            className="flex transform px-3 transition hover:scale-105 hover:underline"
          >
            {" "}
            contact us{" "}
          </Link>
          |
          <Link
            href={hackersGuide}
            className="flex transform px-3 transition hover:scale-105 hover:underline"
          >
            {" "}
            hackers guide
          </Link>
        </div>
        <span className="justify-center pb-10 text-center text-base sm:text-lg md:text-xl lg:text-2xl">
          Copyright © 2019 - 2025 knighthacks. All Rights Reserved.
        </span>
        <span className="sm:text-md justify-center text-center text-sm md:text-lg lg:text-xl">
          Made with 💜 by the Knight Hacks team.
        </span>
      </div>
    </div>
  );
}
