import type { ReactNode } from "react";
import Image from "next/image";

export function GuestJudgeShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f22_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f22_1px,transparent_1px)] bg-[size:14px_24px]" />
      <header className="relative z-20 border-b border-border/70 bg-card/95 shadow-lg shadow-black/10 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Image
            alt="Blade by Knight Hacks"
            className="h-auto w-36 sm:w-44"
            height={375}
            priority
            src="/blade-logo.svg"
            width={1880}
          />
          <span className="text-sm font-medium text-muted-foreground">
            Guest judging
          </span>
        </div>
      </header>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
