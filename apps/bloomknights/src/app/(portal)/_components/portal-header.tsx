"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { signOut } from "~/auth/client";

export function PortalHeader() {
  const pathname = usePathname();

  return (
    <header className="mb-5 overflow-hidden rounded-xl border border-white/35 bg-[#fffaf0] text-[#173b28] shadow-[0_16px_44px_rgba(12,52,29,0.16)] sm:mb-6">
      <div className="flex min-h-16 items-stretch justify-between">
        <Link
          href="/"
          className="hidden items-center border-r border-[#173b28]/15 px-5 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8f285f] sm:flex"
        >
          BloomKnights
          <span className="ml-2 font-medium text-[#607064]">Portal</span>
        </Link>
        <nav
          aria-label="Participant navigation"
          className="grid min-w-0 flex-1 grid-cols-2 sm:flex sm:flex-none"
        >
          <PortalLink
            active={pathname === "/dashboard"}
            href="/dashboard"
            label="Dashboard"
          />
          <PortalLink
            active={pathname.startsWith("/dashboard/profile")}
            href="/dashboard/profile"
            label="Profile"
          />
        </nav>
        <button
          type="button"
          className="flex min-h-16 shrink-0 items-center justify-center gap-2 border-l border-[#173b28]/15 px-4 text-sm font-extrabold transition-colors hover:bg-[#f4ead8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8f285f] sm:px-5"
          onClick={() => void signOut({ redirectTo: "/" })}
        >
          <LogOut aria-hidden="true" className="size-4" />
          <span className="sr-only sm:not-sr-only">Sign out</span>
        </button>
      </div>
    </header>
  );
}

function PortalLink({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      href={href}
      className="relative flex min-h-16 items-center justify-center px-4 text-sm font-extrabold transition-colors hover:bg-[#f4ead8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8f285f] sm:min-w-28"
    >
      {label}
      <span
        aria-hidden="true"
        className={`absolute inset-x-4 bottom-0 h-1 ${active ? "bg-[#8f285f]" : "bg-transparent"}`}
      />
    </Link>
  );
}
