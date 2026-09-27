import type { Metadata } from "next";
import Image from "next/image";
import { ArrowLeft, LayoutDashboard } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Card, CardContent } from "@forge/ui/card";

import { PageEntrance } from "~/app/_components/shared/motion";
import { RouteTransitionLink as Link } from "~/app/_components/shared/route-transition-link";

export const metadata: Metadata = {
  title: "Page not found | Blade",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f22_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f22_1px,transparent_1px)] bg-[size:14px_24px]"
      />

      <header className="sticky top-0 z-30 bg-card/95 shadow-lg shadow-black/10 backdrop-blur">
        <div className="flex h-16 items-center border-b border-border/70 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              aria-label="Blade home"
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Image
                src="/blade-logo.svg"
                alt="Blade by Knight Hacks"
                width={1880}
                height={375}
                priority
                className="h-auto w-32 sm:w-44"
              />
            </Link>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <p className="hidden text-sm font-medium sm:block">
              Page not found
            </p>
          </div>
        </div>
      </header>

      <div className="container relative z-10 flex min-h-[calc(100svh-4rem)] items-center px-3 py-8 sm:px-8 sm:py-12">
        <PageEntrance className="mx-auto w-full max-w-5xl">
          <Card className="overflow-hidden border-white/10 bg-card/95 shadow-2xl shadow-black/25">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-[17rem_minmax(0,1fr)]">
                <div className="flex items-center justify-center border-b border-white/10 bg-background/30 px-6 py-10 md:border-b-0 md:border-r md:py-14">
                  <div className="text-center md:text-left">
                    <p className="font-mono text-7xl font-semibold leading-none text-primary sm:text-8xl">
                      404
                    </p>
                    <p className="mt-3 text-sm font-medium text-muted-foreground">
                      Page not found
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-center p-6 sm:p-10 md:min-h-[25rem] lg:p-14">
                  <h1 className="max-w-xl text-balance text-3xl font-semibold tracking-normal sm:text-4xl">
                    This page isn&apos;t in Blade.
                  </h1>
                  <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-muted-foreground">
                    The address may be wrong, or the page may have moved. Return
                    to Blade or continue to your member dashboard.
                  </p>

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <Button asChild size="lg" className="h-12 px-6 text-base">
                      <Link href="/">
                        <ArrowLeft aria-hidden="true" className="size-4" />
                        Back to Blade
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="h-12 px-6 text-base"
                    >
                      <Link href="/member/dashboard">
                        <LayoutDashboard
                          aria-hidden="true"
                          className="size-4"
                        />
                        Member dashboard
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageEntrance>
      </div>
    </main>
  );
}
