"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@forge/ui/button";

export default function MemberEventsError({ reset }: { reset: () => void }) {
  return (
    <main className="container flex min-h-[70svh] items-center justify-center py-12">
      <div className="max-w-md space-y-4 rounded-lg border border-destructive/25 bg-card/95 p-6 text-center shadow-2xl shadow-black/25">
        <AlertTriangle
          className="mx-auto h-8 w-8 text-destructive"
          aria-hidden="true"
        />
        <h1 className="text-2xl font-semibold">
          Member events could not be loaded
        </h1>
        <p className="text-sm text-muted-foreground">
          Try again. Your account and attendance history are unchanged.
        </p>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
