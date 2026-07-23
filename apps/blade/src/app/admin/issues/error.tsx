"use client";

import { Button } from "@forge/ui/button";

export default function IssuesError({ reset }: { reset: () => void }) {
  return (
    <div className="container grid min-h-[60svh] place-items-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Issues could not be loaded</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your access may have changed, or the workspace is temporarily
          unavailable.
        </p>
        <Button className="mt-4" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
