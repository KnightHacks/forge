import Link from "next/link";
import { Separator } from "../ui/separator";
import { footerLinks, footerMessage } from "./footerContent";
import React from "react";

export default function Footer() {
  return (
    <div className="w-full tk-peridot-devanagari text-white font-semibold">
      <div className="flex flex-col items-center justify-center w-full">
        <div className="w-[90%] sm:w-[85%] md:w-4/5">
          <Separator className="mt-6 sm:mt-8 md:mt-10 mb-3 sm:mb-4 h-[1px] bg-white" />
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center my-6 sm:my-8 md:my-10 gap-4 sm:gap-0">
          {footerLinks.map((link, index) => (
            <React.Fragment key={index}>
              <div className="flex flex-row items-center justify-center mx-4 sm:mx-6 md:mx-10">
                <Link 
                  href={link.href} 
                  className="text-center text-base sm:text-lg transform transition hover:scale-105 hover:text-[#FBB03B] duration-300"
                  target="_blank"
                  rel="noopener noreferrer"
                > 
                  {link.text}
                </Link>
              </div>
              {index < footerLinks.length - 1 && (
                <div className="hidden sm:block">
                  <Separator
                    orientation="vertical"
                    className="mx-2 h-6 w-[1px] bg-white data-[orientation=vertical]:h-6" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-center my-6 sm:my-8 md:my-10 px-4 sm:px-6 md:px-8">
          <span className="text-center text-sm sm:text-base"> {footerMessage} </span>
        </div>
      </div>
    </div>
  );
} 