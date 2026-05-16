"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@forge/ui/button";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Teams", href: "/teams" },
  { label: "Events", href: "/events" },
  { label: "Sponsors", href: "/sponsors" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-6 pt-11 md:px-10 lg:px-24">
      <nav className="relative flex min-h-[82px] items-center justify-between border-[3px] border-black bg-[#F65C2933] px-6 shadow-[6px_6px_0px_0px_#00000038] backdrop-blur-sm md:px-7 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
          aria-label="Knight Hacks home"
        >
          <Image
            src="/kh-icon.svg"
            alt="Knight Hacks Logo"
            width={40}
            height={40}
            priority
          />
          <span className="font-inter text-[15px] font-bold uppercase leading-[19.5px] tracking-[0.57px] text-white">
            Knight Hacks
          </span>
        </Link>

        <div className="hidden items-center gap-12 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`font-inter text-[13px] font-bold uppercase leading-[19.5px] tracking-[0.57px] transition hover:text-[var(--club-gold)] ${
                pathname === item.href
                  ? "text-[var(--club-gold)]"
                  : "text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          className="flex size-11 items-center justify-center border-[3px] border-black bg-[#170d1c] text-white shadow-[4px_4px_0_var(--club-gold-soft)] lg:hidden"
          aria-expanded={isMobileOpen}
          aria-controls="club-mobile-menu"
          aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setIsMobileOpen((open) => !open)}
        >
          <span className="sr-only">
            {isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
          </span>
          <span className="flex flex-col gap-1.5">
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
          </span>
        </button>

        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <Button asChild size="lg" className="club-button club-button-dark">
            <a href="https://blade.knighthacks.org">Sign Up With Blade</a>
          </Button>
          <Button
            asChild
            size="lg"
            className="club-button club-button-pink px-7"
          >
            <a href="https://discord.gg/knighthacks">Join Discord</a>
          </Button>
        </div>

        {isMobileOpen ? (
          <div
            id="club-mobile-menu"
            className="absolute left-0 top-[calc(100%+0.75rem)] z-50 flex w-full flex-col gap-2 border-[3px] border-black bg-[#170d1c]/95 p-4 shadow-[6px_6px_0px_0px_#00000038] backdrop-blur-sm lg:hidden"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`font-inter text-[13px] font-bold uppercase leading-[19.5px] tracking-[0.57px] transition hover:text-[var(--club-gold)] ${
                  pathname === item.href
                    ? "text-[var(--club-gold)]"
                    : "text-white"
                }`}
                onClick={() => setIsMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-3 md:hidden">
              <Button
                asChild
                size="lg"
                className="club-button club-button-dark justify-center"
              >
                <a href="https://blade.knighthacks.org">Sign Up With Blade</a>
              </Button>
              <Button
                asChild
                size="lg"
                className="club-button club-button-pink px-7"
              >
                <a href="https://discord.gg/knighthacks">Join Discord</a>
              </Button>
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
