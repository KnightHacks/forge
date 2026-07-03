import Link from "next/link";

import { Button } from "@forge/ui/button";

export function PortalUnavailable({ displayName }: { displayName?: string }) {
  return (
    <main className="container flex min-h-screen items-center justify-center py-16 text-center">
      <section className="max-w-xl space-y-4 rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-3xl font-bold">
          {displayName
            ? `${displayName} portal unavailable`
            : "Portal unavailable"}
        </h1>
        <p className="text-muted-foreground">
          This hackathon does not have an active participant portal. Visit the
          Knight Hacks website or Discord for current event information.
        </p>
        <Button asChild>
          <Link href="/dashboard">Return to Blade</Link>
        </Button>
      </section>
    </main>
  );
}
