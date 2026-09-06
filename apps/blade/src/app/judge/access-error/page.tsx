import { QrCode } from "lucide-react";

import { Button } from "@forge/ui/button";

import { RouteTransitionLink as Link } from "~/app/_components/shared/route-transition-link";

export default function JudgingAccessErrorPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-xl items-center px-4 py-10 sm:px-6">
      <section className="w-full rounded-lg border border-border bg-card p-6 text-center shadow-2xl shadow-black/20 sm:p-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 text-destructive-foreground">
          <QrCode className="size-6" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">
          This room link is closed
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Ask the room organizer for the current QR code. The old code may have
          been rotated or revoked.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/">Return to Blade</Link>
        </Button>
      </section>
    </main>
  );
}
