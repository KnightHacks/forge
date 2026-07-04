import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Button } from "@forge/ui/button";

import { BloomKnightsDashboardShell } from "./bloomknights-dashboard-shell";

export function AuthRetry({
  callbackPath,
  withShell = true,
}: {
  callbackPath: string;
  withShell?: boolean;
}) {
  const signInUrl = `/api/auth/signin?provider=discord&callbackURL=${encodeURIComponent(callbackPath)}`;

  const retryCard = (
    <section className="mx-auto max-w-xl rounded-[2rem] border border-white/70 bg-[#FFFDF1]/95 p-8 text-center text-[#42602A] shadow-xl">
      <AlertCircle className="mx-auto size-10 text-[#f384d4]" />
      <h1 className="mt-4 text-3xl font-black">Discord sign-in stopped</h1>
      <p className="mt-3 text-[#53634A]">
        Sign-in was canceled or could not be completed. Your application data
        has not been changed.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild className="rounded-full bg-[#f384d4] text-white">
          <a href={signInUrl}>Try Discord again</a>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </section>
  );

  if (!withShell) {
    return retryCard;
  }

  return <BloomKnightsDashboardShell>{retryCard}</BloomKnightsDashboardShell>;
}
