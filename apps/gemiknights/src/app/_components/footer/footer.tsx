import React from "react";
import Link from "next/link";

import { Separator } from "@forge/ui/separator";

import { footerLinks, footerMessage } from "./footerContent";

export default function Footer() {
  return (
    <div className="tk-peridot-devanagari w-full font-semibold text-white">
      <div className="flex w-full flex-col items-center justify-center">
        <div className="w-[90%] sm:w-[85%] md:w-4/5">
          <Separator className="mb-3 mt-6 h-[1px] bg-white sm:mb-4 sm:mt-8 md:mt-10" />
        </div>
        <div className="my-6 flex flex-col items-center justify-center gap-4 sm:my-8 sm:flex-row sm:gap-0 md:my-10">
          {footerLinks.map((link, index) => (
            <React.Fragment key={index}>
              <div className="mx-4 flex flex-row items-center justify-center sm:mx-6 md:mx-10">
                {link.href.startsWith("mailto:") ? (
                  <a
                    href={link.href}
                    className="transform text-center text-base transition duration-300 hover:scale-105 hover:text-[#FBB03B] sm:text-lg"
                  >
                    {link.text}
                  </a>
                ) : (
                  <Link
                    href={link.href}
                    className="transform text-center text-base transition duration-300 hover:scale-105 hover:text-[#FBB03B] sm:text-lg"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.text}
                  </Link>
                )}
              </div>
              {index < footerLinks.length - 1 && (
                <div className="hidden sm:block">
                  <Separator
                    orientation="vertical"
                    className="mx-2 h-6 w-[1px] bg-white data-[orientation=vertical]:h-6"
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="my-6 flex justify-center px-4 sm:my-8 sm:px-6 md:my-10 md:px-8">
          <span className="text-center text-sm sm:text-base">
            {" "}
            {footerMessage}{" "}
          </span>
        </div>
      </div>
    </div>
  );
}
