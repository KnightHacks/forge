"use client";

import Link from "next/link";

import { Button } from "@forge/ui/button";

import { signOut } from "~/auth/client";

export function PortalHeader() {
  return (
    <nav
      aria-label="Participant navigation"
      className="mb-8 flex flex-wrap items-center justify-center gap-3"
    >
      <Button asChild className="bk-bloom-cta-action rounded-full">
        <Link href="/dashboard">Dashboard</Link>
      </Button>
      <Button asChild variant="secondary" className="rounded-full">
        <Link href="/dashboard/profile">Profile</Link>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="rounded-full bg-white/85 text-[#42602A]"
        onClick={() => void signOut({ redirectTo: "/" })}
      >
        Sign out
      </Button>
    </nav>
  );
}
