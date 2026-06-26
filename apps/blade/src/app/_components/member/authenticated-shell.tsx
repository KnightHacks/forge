import type { ReactNode } from "react";
import Image from "next/image";

import type { Session } from "@forge/auth/server";

import { SignOutButton } from "~/app/_components/auth/sign-out-button";

export function AuthenticatedShell({
  children,
  session,
}: {
  children: ReactNode;
  session: Session;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f22_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f22_1px,transparent_1px)] bg-[size:14px_24px]" />
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="container flex min-h-16 items-center justify-between gap-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/white-kh-title-logo.svg"
              alt="Knight Hacks"
              width={2040}
              height={551}
              priority
              style={{ height: "40px", width: "148px" }}
            />
            <div className="hidden h-8 w-px bg-border sm:block" />
            <p className="hidden truncate text-sm text-muted-foreground sm:block">
              {session.user.name}
            </p>
          </div>
          <SignOutButton />
        </div>
      </header>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
