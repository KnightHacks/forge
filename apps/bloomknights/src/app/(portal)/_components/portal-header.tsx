"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";

import { signOut } from "~/auth/client";

export function PortalHeader() {
  const pathname = usePathname();

  return (
    <header className="bk-portal-nav bk-dashboard-nav mb-5 overflow-hidden rounded-2xl sm:mb-6">
      <div className="flex min-h-16 items-stretch justify-between">
        <Link
          href="/"
          aria-label="Go back to the BK site"
          title="Go back to the BK site"
          className="font-righteous flex min-h-16 shrink-0 items-center gap-2 whitespace-nowrap border-r border-[#245f35]/15 px-3 text-xs uppercase tracking-[0.04em] text-[#245f35] transition-colors hover:bg-[#daeaf5]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7aab5a] sm:px-5 sm:text-sm"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Back to BloomKnights site</span>
          <span className="sm:hidden">Site</span>
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
          className="font-righteous flex min-h-16 shrink-0 items-center justify-center gap-2 border-l border-[#245f35]/15 px-4 text-xs uppercase tracking-[0.04em] text-[#245f35] transition-colors hover:bg-[#daeaf5]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7aab5a] sm:px-5"
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
      className="font-righteous relative flex min-h-16 items-center justify-center px-4 text-xs uppercase tracking-[0.06em] text-[#245f35] transition-colors hover:bg-[#daeaf5]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7aab5a] sm:min-w-28 sm:text-sm"
    >
      {label}
      <span
        aria-hidden="true"
        className={`absolute inset-x-4 bottom-0 h-1 rounded-t-full ${active ? "bg-[linear-gradient(90deg,#c9b8d8,#a8d471)]" : "bg-transparent"}`}
      />
    </Link>
  );
}
