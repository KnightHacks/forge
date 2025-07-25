import Image from "next/image";
import Link from "next/link";

const FOOTER_LINKS = [
  {
    href: "https://mlh.io/code-of-conduct",
    label: "MLH Code of Conduct",
    hoverColor: "hover:bg-[#FBB03B]",
  },
  {
    href: "https://knight-hacks.notion.site/code-of-conduct",
    label: "Knight Hacks Code of Conduct",
    hoverColor: "hover:bg-[#d83434]",
  },
  {
    href: "https://blade.knighthacks.org/sponsor",
    label: "Sponsor Us",
    hoverColor: "hover:bg-[#1570AD]",
  },
  {
    href: "https://knight-hacks.notion.site/knight-hacks-viii",
    label: "Hackers Guide",
    hoverColor: "hover:bg-[#FBB03B]",
  },
] as const;

interface FooterLinkProps {
  href: string;
  label: string;
  hoverColor: string;
  isMobile?: boolean;
}

function FooterLink({ href, label, hoverColor, isMobile = false }: FooterLinkProps) {
  const baseClasses = "tk-ccmeanwhile relative block rounded-none bg-[#F7F0C6] font-bold text-slate-800 outline-2 -outline-offset-3 outline-black transition-all duration-200 ease-in-out group-hover:-translate-x-1 group-hover:-translate-y-1 hover:text-white";
  const mobileClasses = "px-2 py-1.5 text-xs sm:px-3 sm:py-2";
  const desktopClasses = "px-4 py-2 text-sm md:text-base";
  
  return (
    <div className="group relative">
      <Link
        href={href}
        className={`${baseClasses} ${isMobile ? mobileClasses : desktopClasses} ${hoverColor}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
      </Link>
      <div className="absolute inset-0 -z-10 h-full w-full bg-black transition-all duration-200 ease-in-out group-hover:translate-x-2 group-hover:translate-y-2" />
    </div>
  );
}

function MobileNavigation() {
  return (
    <div className="flex flex-col items-center gap-6 md:hidden">
      <div className="flex flex-wrap items-center justify-center gap-2 text-white sm:gap-3">
        {FOOTER_LINKS.map((link) => (
          <FooterLink
            key={link.href}
            href={link.href}
            label={link.label}
            hoverColor={link.hoverColor}
            isMobile={true}
          />
        ))}
      </div>
    </div>
  );
}

function DesktopNavigation() {
  return (
    <div className="hidden items-center justify-center gap-8 md:flex">
      <div className="flex flex-wrap items-center justify-center gap-4 text-white">
        {FOOTER_LINKS.map((link) => (
          <FooterLink
            key={link.href}
            href={link.href}
            label={link.label}
            hoverColor={link.hoverColor}
            isMobile={false}
          />
        ))}
      </div>
      <div className="flex items-center ml-4">
        <Image
          src="/KH2025Small.svg"
          alt="Knight Hacks 2025 Logo"
          width={80}
          height={80}
          className="h-16 w-16 md:h-20 md:w-20"
        />
      </div>
    </div>
  );
}

function Copyright() {
  return (
    <div className="text-center bg-black/50 backdrop-blur-sm rounded-lg px-4 py-3 mx-auto max-w-fit">
      <p className="tk-ccmeanwhile text-sm text-white md:text-base">
        Copyright © 2019 - 2025 knighthacks. All Rights Reserved.
      </p>
      <p className="tk-ccmeanwhile mt-1 text-sm text-white md:text-base">
        Made with 💜 by the Knight Hacks team.
      </p>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="py-8 bg-transparent">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6 border-t border-gray-800 pt-6">
          <MobileNavigation />
          <DesktopNavigation />
        </div>
        <Copyright />
      </div>
    </footer>
  );
}
