"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@forge/ui/button";

export default function HackathonCheckInError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main className="container flex min-h-[70svh] items-center justify-center py-12">
      <div className="max-w-md space-y-4 rounded-lg border border-destructive/25 bg-card/95 p-6 text-center shadow-2xl shadow-black/25">
        <AlertTriangle
          className="mx-auto size-10 text-destructive"
          aria-hidden="true"
        />
        <h1 className="text-2xl font-semibold">
          Hackathon check-in could not be loaded
        </h1>
        <p className="text-sm text-muted-foreground">
          No check-in was submitted from this error screen. Try loading the
          station again.
        </p>
        <Button className="min-h-11" onClick={reset} type="button">
          Try again
        </Button>
      </div>
    </main>
  );
}
