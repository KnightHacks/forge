import Link from "next/link";

import { Button } from "@forge/ui/button";

export function SiteHeader() {
  return (
    <header className="guild-site-header sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* Reuse the same wordmark members see in Blade. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://blade.knighthacks.org/white-kh-title-logo.svg"
            alt="Knight Hacks"
            className="h-6 w-auto shrink-0 sm:h-7"
          />
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="text-sm font-medium text-primary">/ Guild</span>
          </span>
        </Link>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="group/edit gap-2 border-[hsl(var(--guild-blue)/0.2)] bg-background/60 hover:border-[hsl(var(--guild-blue)/0.4)] hover:bg-[hsl(var(--guild-blue)/0.08)]"
        >
          <a
            href="https://blade.knighthacks.org/member/settings"
            target="_blank"
            rel="noreferrer"
          >
            <span className="hidden sm:inline">Edit your profile</span>
            <span className="sm:hidden">Edit</span>
          </a>
        </Button>
      </div>
    </header>
  );
}
