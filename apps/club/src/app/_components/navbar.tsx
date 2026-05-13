"use client";

import Link from "next/link";
import Image from "next/image";
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

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-6 pt-11 md:px-10 lg:px-24">
      <nav className="flex min-h-[82px] items-center justify-between border-[3px] border-black bg-[#F65C2933] px-6 shadow-[6px_6px_0px_0px_#00000038] backdrop-blur-sm md:px-7 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
          aria-label="Knight Hacks home"
        >
          <Image src="/kh-icon.svg" alt="" width={40} height={40} priority />
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
                pathname === item.href ? "text-[var(--club-gold)]" : "text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <Button
            asChild
            size="lg"
            className="club-button club-button-dark"
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
      </nav>
    </header>
  );
}
