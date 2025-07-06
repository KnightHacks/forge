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
    <div className="mx-auto flex flex-col items-center pt-16">
      <div className="relative w-full">
        <Image
          src={shadow}
          alt="Shadow"
          width={0}
          height={0}
          sizes="100vw"
          objectFit="cover"
          className="absolute bottom-0 left-1/2 mb-6 sm:mb-8 md:mb-10 w-full -translate-x-1/2 opacity-75"
        />
        <Image
          src={footerSVG}
          alt="Knight Hacks Logo"
          width={2267}
          height={803}
          objectFit="cover"
          className="absolute bottom-0 left-1/2 mb-12 sm:mb-16 md:mb-20 w-1/2 sm:w-2/5 md:w-1/3 lg:w-1/4 -translate-x-1/2"
        />
      </div>
      <div
        className={`${bn.className} -mt-6 sm:-mt-8 md:-mt-10 flex w-full flex-col justify-center bg-black pt-8 sm:pt-12 md:pt-15 pb-4 sm:pb-5 text-white`}
      >
        <div className="mb-2 sm:mb-3 flex flex-col sm:flex-row justify-center items-center px-2 text-center text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl gap-1 sm:gap-2">
          <Link
            href={mlhcoc}
            className="flex transform px-2 sm:px-3 transition hover:scale-105 hover:underline"
          >
            MLH code of conduct
          </Link>
          <span className="hidden sm:inline">|</span>
          <Link
            href={sponsor}
            className="flex transform px-2 sm:px-3 transition hover:scale-105 hover:underline"
          >
            sponsor us
          </Link>
          <span className="hidden sm:inline">|</span>
          <Link
            href={contact}
            className="flex transform px-2 sm:px-3 transition hover:scale-105 hover:underline"
          >
            contact us
          </Link>
          <span className="hidden sm:inline">|</span>
          <Link
            href={hackersGuide}
            className="flex transform px-2 sm:px-3 transition hover:scale-105 hover:underline"
          >
            hackers guide
          </Link>
        </div>
        <span className="justify-center pb-6 sm:pb-8 md:pb-10 text-center text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl">
          Copyright © 2019 - 2025 knighthacks. All Rights Reserved.
        </span>
        <span className="justify-center text-center text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl">
          Made with 💜 by the Knight Hacks team.
        </span>
      </div>
    </div>
  );
}
