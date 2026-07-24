"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@forge/ui/button";

import { SiteHeader } from "~/app/_components/site-header";

export default function GuildError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="guild-shell">
      <SiteHeader />
      <main className="container flex min-h-[calc(100svh-4rem)] items-center justify-center py-12">
        <section className="w-full max-w-xl rounded-xl border border-white/10 bg-card/80 px-6 py-12 text-center shadow-2xl shadow-black/20 sm:px-10">
          <TriangleAlert
            className="mx-auto h-10 w-10 text-[hsl(var(--guild-gold))]"
            aria-hidden="true"
          />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
            The Guild could not be loaded
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Your place is still here. Try the request again, or return in a
            moment if the directory is temporarily unavailable.
          </p>
          <Button type="button" className="mt-7 gap-2" onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        </section>
      </main>
    </div>
  );
}
