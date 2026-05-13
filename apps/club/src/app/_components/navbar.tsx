import Image from "next/image";
import { Button } from "@forge/ui/button";

const navItems = [
  { label: "Home", href: "#", active: true },
  { label: "Teams", href: "#teams" },
  { label: "Events", href: "#events" },
  { label: "Sponsors", href: "#sponsors" },
];

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-6 pt-11 md:px-10 lg:px-24">
      <nav className="flex min-h-[82px] items-center justify-between border-[3px] border-black bg-[#F65C2933] px-6 shadow-[0_8px_0_rgba(39,4,51,0.95)] backdrop-blur-sm md:px-7 lg:px-8">
        <a
          href="#"
          className="flex shrink-0 items-center gap-3"
          aria-label="Knight Hacks home"
        >
          <Image src="/kh-icon.svg" alt="" width={40} height={40} priority />
          <span className="font-inter text-[15px] font-bold uppercase leading-[19.5px] tracking-[0.57px] text-white">
            Knight Hacks
          </span>
        </a>

        <div className="hidden items-center gap-12 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`font-inter text-[13px] font-bold uppercase leading-[19.5px] tracking-[0.57px] transition hover:text-[var(--club-gold)] ${
                item.active ? "text-[var(--club-gold)]" : "text-white"
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <Button
            asChild
            size="lg"
            className="font-inter h-auto rounded-none border-[3px] border-black bg-[#170d1c] px-6 py-4 text-[13px] font-bold uppercase leading-[19.5px] tracking-[0.57px] text-white shadow-[4px_4px_0_var(--club-gold-soft)] transition hover:-translate-y-0.5 hover:bg-[#170d1c] hover:text-white hover:shadow-[6px_6px_0_var(--club-gold-soft)]"
          >
            <a href="https://blade.knighthacks.org">Sign Up With Blade</a>
          </Button>
          <Button
            asChild
            size="lg"
            className="font-inter h-auto rounded-none border-[3px] border-black bg-[linear-gradient(90deg,#FFE1BD_0%,#FE88A4_100%)] px-7 py-4 text-[13px] font-bold uppercase leading-[19.5px] tracking-[0.57px] text-black shadow-[4px_4px_0_#f6a3bb] transition hover:-translate-y-0.5 hover:bg-[linear-gradient(90deg,#FFE1BD_0%,#FE88A4_100%)] hover:text-black hover:shadow-[6px_6px_0_#f6a3bb]"
          >
            <a href="https://discord.gg/knighthacks">Join Discord</a>
          </Button>
        </div>
      </nav>
    </header>
  );
}
