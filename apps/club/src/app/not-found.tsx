import Image from "next/image";
import Link from "next/link";

import { Button } from "@forge/ui/button";

import { CLUB_ASSETS } from "./_lib/assets";

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100svh-var(--club-nav-height))] items-center justify-center px-5 pb-12 pt-[calc(var(--club-nav-height)+2rem)] text-white">
      <div className="mx-auto flex w-full max-w-[28rem] flex-col items-center text-center">
        <Image
          src={CLUB_ASSETS.tklenny}
          alt="Lenny, the green dragon mascot, standing next to T.K., the knight mascot"
          width={3000}
          height={3000}
          priority
          sizes="12rem"
          className="w-44 max-w-[62vw] drop-shadow-[0_1.2rem_1.4rem_rgba(0,0,0,0.35)] md:w-52"
        />
        <p className="club-eyebrow mt-6 text-xs font-black">404</p>
        <h1 className="mt-2 text-4xl font-black leading-none tracking-normal text-white md:text-5xl">
          Page not found.
        </h1>
        <p className="text-white/72 mt-4 text-base font-semibold leading-7">
          Lenny and T.K. could not find that page.
        </p>
        <Button
          asChild
          size="lg"
          className="club-button mt-7 min-h-[3.35rem] bg-[var(--club-gold)] text-black shadow-[4px_4px_0_#ffffff]"
        >
          <Link href="/" prefetch={false}>
            Go home
          </Link>
        </Button>
      </div>
    </main>
  );
}
