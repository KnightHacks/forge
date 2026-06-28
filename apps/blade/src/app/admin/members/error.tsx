"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@forge/ui/button";

export default function AdminMembersError({ reset }: { reset: () => void }) {
  return (
    <main className="container flex min-h-[70svh] items-center justify-center py-12">
      <div className="max-w-md space-y-4 rounded-lg border border-destructive/25 bg-card/95 p-6 text-center shadow-2xl shadow-black/25">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-destructive/15 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold">Members could not be loaded</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Your filters are still in the URL. Try loading this view again.
        </p>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
