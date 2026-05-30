import React from "react";
import Link from "next/link";

import { Separator } from "@forge/ui/separator";

import { footerLinks, footerMessage } from "./footerContent";

const footerLinkClassName =
  "wc-footer-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff7dc] focus-visible:ring-offset-2 focus-visible:ring-offset-[#245f34]";
const footerLinkColors = ["#fff7dc", "#6fa04d", "#4a8139", "#245f35"];

export default function Footer() {
  return (
    <div className="font-dm-sans w-full font-semibold">
      <div className="flex w-full flex-col items-center justify-center">
        <div className="w-[90%] sm:w-[85%] md:w-4/5">
          <Separator className="wc-footer-rule mb-2 mt-3 h-[1px] sm:mb-3 sm:mt-4 md:mt-5" />
        </div>
        <div className="wc-footer-copy flex w-full flex-col items-center">
          <div className="my-3 flex flex-col items-center justify-center gap-3 sm:my-5 sm:flex-row sm:gap-0 md:my-6">
            {footerLinks.map((link, index) => {
              const linkStyle = {
                "--wc-footer-color": footerLinkColors[index],
              } as React.CSSProperties;

              return (
                <React.Fragment key={index}>
                  <div className="mx-4 flex flex-row items-center justify-center sm:mx-6 md:mx-10">
                    {link.href.startsWith("mailto:") ? (
                      <a
                        href={link.href}
                        className={footerLinkClassName}
                        style={linkStyle}
                      >
                        {link.text}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className={footerLinkClassName}
                        style={linkStyle}
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
                        className="wc-footer-divider mx-2 h-6 w-[1px] data-[orientation=vertical]:h-6"
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="mb-4 mt-2 flex w-full justify-center px-4 sm:mb-6 sm:mt-4 sm:px-6 md:mb-7 md:px-8">
            <span className="wc-footer-message block max-w-[22rem] sm:max-w-full">
              {footerMessage}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
