"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@forge/ui/button";

export default function AdminLogsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60svh] w-full max-w-3xl items-center justify-center p-6">
      <div className="w-full rounded-lg border border-destructive/35 bg-card p-6 text-center">
        <AlertTriangle
          className="mx-auto h-8 w-8 text-destructive"
          aria-hidden="true"
        />
        <h1 className="mt-4 text-xl font-semibold">
          Unable to load admin logs
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button type="button" className="mt-5" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
