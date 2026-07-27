"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@forge/ui/button";

export default function DiscordArchiveHealthError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main className="container flex min-h-[70svh] items-center justify-center py-12">
      <div className="max-w-md space-y-4 rounded-lg border border-destructive/25 bg-card/95 p-6 text-center shadow-2xl shadow-black/25">
        <div className="mx-auto grid size-12 place-items-center rounded-md bg-destructive/15 text-destructive">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold">
          Archive health could not be loaded
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          No archived messages were exposed. Try loading the operational summary
          again.
        </p>
        <Button onClick={reset} type="button">
          Try again
        </Button>
      </div>
    </main>
  );
}
