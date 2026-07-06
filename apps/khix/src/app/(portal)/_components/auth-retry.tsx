import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Button } from "@forge/ui/button";

export function AuthRetry({ callbackPath }: { callbackPath: string }) {
  const signInUrl = `/api/auth/signin?provider=discord&callbackURL=${encodeURIComponent(callbackPath)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07150f] px-4 py-10 text-white">
      <section className="bg-[#0f2418]/92 w-full max-w-xl rounded-lg border border-white/20 p-8 text-center shadow-2xl">
        <AlertCircle className="mx-auto size-10 text-[#d7ff76]" />
        <h1 className="mt-4 text-3xl font-black">Discord sign-in stopped</h1>
        <p className="text-white/72 mt-3">
          Sign-in was canceled or could not be completed. Your application data
          has not been changed.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-full bg-[#d7ff76] text-[#0f2418]">
            <a href={signInUrl}>Try Discord again</a>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
