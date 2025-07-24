import Image from "next/image";
import Link from "next/link";

const footerSVG = "./khFull.svg";
const shadow = "./shadow.svg";
const mlhcoc = "https://mlh.io/code-of-conduct";
const sponsor = "https://blade.knighthacks.org/sponsor";
const khcoc = "https://knight-hacks.notion.site/code-of-conduct";
const hackersGuide = "https://knight-hacks.notion.site/knight-hacks-viii";

export default function Footer() {
  return (
    <div className="mx-auto flex flex-col items-center bg-black pt-16 pb-8">
      {/* Logo Section - Now properly in black background */}
      <div className="relative mb-12 flex w-full justify-center">
        <div className="relative">
          <Image
            src={shadow}
            alt="Shadow"
            width={0}
            height={0}
            sizes="100vw"
            objectFit="cover"
            className="absolute top-4 left-1/2 w-full max-w-md -translate-x-1/2 opacity-75 sm:max-w-lg md:max-w-xl lg:max-w-2xl"
          />
          <Image
            src={footerSVG}
            alt="Knight Hacks Logo"
            width={2267}
            height={803}
            objectFit="cover"
            className="relative h-auto w-64 sm:w-80 md:w-96 lg:w-112 xl:w-128"
          />
        </div>
      </div>

      {/* Footer Content - TextBox Style Cards */}
      <div className="w-full px-2 py-4">
        <div className="mx-auto max-w-7xl">
          {/* Links Section - Three colored cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Red Card - MLH & Contact */}
            <div className="group relative">
              <div className="relative rounded-none bg-[#F7F0C6] p-4 outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1 md:p-6">
                <div className="text-center">
                  <h3 className="tk-ccmeanwhile mb-3 text-lg font-bold text-[#d83434] brightness-75 md:text-xl">
                    COMMUNITY
                  </h3>
                  <div className="space-y-2">
                    <Link
                      href={mlhcoc}
                      className="tk-ccmeanwhile block text-sm text-slate-800 underline transition-colors hover:text-[#d83434] md:text-base"
                    >
                      MLH Code of Conduct
                    </Link>
                    <Link
                      href={khcoc}
                      className="tk-ccmeanwhile block text-sm text-slate-800 underline transition-colors hover:text-[#d83434] md:text-base"
                    >
                      Knight Hacks Code of Conduct
                    </Link>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 left-0 -z-10 h-full w-full rounded-none bg-black transition-transform duration-100 group-hover:translate-x-2 group-hover:translate-y-2" />
            </div>

            {/* Yellow Card - Sponsor & Guide */}
            <div className="group relative">
              <div className="relative rounded-none bg-[#F7F0C6] p-4 outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1 md:p-6">
                <div className="text-center">
                  <h3 className="tk-ccmeanwhile mb-3 text-lg font-bold text-[#FBB03B] brightness-75 md:text-xl">
                    RESOURCES
                  </h3>
                  <div className="space-y-2">
                    <Link
                      href={sponsor}
                      className="tk-ccmeanwhile block text-sm text-slate-800 underline transition-colors hover:text-[#FBB03B] md:text-base"
                    >
                      Sponsor Us
                    </Link>
                    <Link
                      href={hackersGuide}
                      className="tk-ccmeanwhile block text-sm text-slate-800 underline transition-colors hover:text-[#FBB03B] md:text-base"
                    >
                      Hackers Guide
                    </Link>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 left-0 -z-10 h-full w-full rounded-none bg-black transition-transform duration-100 group-hover:translate-x-2 group-hover:translate-y-2" />
            </div>

            {/* Blue Card - Event Info */}
            <div className="group relative">
              <div className="relative rounded-none bg-[#F7F0C6] p-4 outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1 md:p-6">
                <div className="text-center">
                  <h3 className="tk-ccmeanwhile mb-3 text-lg font-bold text-[#1570AD] brightness-75 md:text-xl">
                    EVENT
                  </h3>
                  <div className="space-y-2">
                    <p className="tk-ccmeanwhile text-sm text-slate-800 md:text-base">
                      36-Hour Hackathon
                    </p>
                    <p className="tk-ccmeanwhile text-sm text-slate-800 md:text-base">
                      Oct 24 - 26, 2025
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 left-0 -z-10 h-full w-full rounded-none bg-black transition-transform duration-100 group-hover:translate-x-2 group-hover:translate-y-2" />
            </div>
          </div>

          {/* Copyright Section - Single centered card */}
          <div className="flex justify-center">
            <div className="group relative w-full max-w-2xl">
              <div className="relative rounded-none bg-[#F7F0C6] p-4 outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1 md:p-6">
                <div className="space-y-2 text-center">
                  <p className="tk-ccmeanwhile text-sm text-slate-800 md:text-base">
                    Copyright © 2019 - 2025 knighthacks. All Rights Reserved.
                  </p>
                  <p className="tk-ccmeanwhile text-sm text-slate-800 md:text-base">
                    Made with 💜 by the Knight Hacks team.
                  </p>
                </div>
              </div>
              <div className="absolute top-0 left-0 -z-10 h-full w-full rounded-none bg-black transition-transform duration-100 group-hover:translate-x-2 group-hover:translate-y-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
