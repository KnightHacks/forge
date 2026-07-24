"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";

export function SiteHeader() {
  const pathname = usePathname();
  const navigation = [
    {
      active: pathname === "/" || pathname.startsWith("/members/"),
      href: "/",
      label: "People",
    },
    {
      active: pathname.startsWith("/companies"),
      href: "/companies",
      label: "Companies",
    },
    {
      active: pathname.startsWith("/globe"),
      href: "/globe",
      label: "Globe",
    },
  ] as const;

  return (
    <header className="guild-site-header sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl">
      <div className="container flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
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
        <nav
          aria-label="Guild sections"
          className="guild-primary-nav order-3 flex w-full items-center gap-1 rounded-lg border border-white/10 bg-background/55 p-1 shadow-lg shadow-black/10 sm:order-none sm:w-auto"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "relative flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none",
                item.active
                  ? "bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2),0_6px_18px_hsl(var(--primary)/0.08)]"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              {item.label}
              {item.active ? (
                <span
                  className="absolute inset-x-3 -bottom-1 h-px bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                  aria-hidden="true"
                />
              ) : null}
            </Link>
          ))}
        </nav>
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
