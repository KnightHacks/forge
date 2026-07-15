"use client";

import { Button } from "@forge/ui/button";

export default function MemberFormsError({ reset }: { reset: () => void }) {
  return (
    <main className="container py-12">
      <section className="rounded-lg border border-destructive/40 bg-card/95 p-6">
        <h1 className="text-xl font-semibold">Previous forms could not load</h1>
        <Button className="mt-4 min-h-11" onClick={reset}>
          Try again
        </Button>
      </section>
    </main>
  );
}
