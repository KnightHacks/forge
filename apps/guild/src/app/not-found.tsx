import Link from "next/link";
import { ArrowLeft, UserRoundSearch } from "lucide-react";

import { Button } from "@forge/ui/button";

import { SiteHeader } from "~/app/_components/site-header";

export default function GuildNotFound() {
  return (
    <div className="guild-shell">
      <SiteHeader />
      <main className="container flex min-h-[calc(100svh-4rem)] items-center justify-center py-12">
        <section className="w-full max-w-xl rounded-xl border border-white/10 bg-card/80 px-6 py-12 text-center shadow-2xl shadow-black/20 sm:px-10">
          <UserRoundSearch
            className="mx-auto h-10 w-10 text-primary"
            aria-hidden="true"
          />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--guild-gold))]">
            Guild Collective
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Profile unavailable
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            This profile may be private, may no longer exist, or the link may be
            incorrect.
          </p>
          <Button asChild className="mt-7 gap-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Explore the Guild
            </Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
