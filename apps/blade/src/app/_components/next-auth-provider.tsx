"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

export function NextAuthProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
