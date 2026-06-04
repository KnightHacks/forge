"use client";

import { ThemeProvider } from "@forge/ui/theme";
import { Toaster } from "@forge/ui/toast";

import { ThemeToggleRouteGuard } from "~/app/_components/theme-toggle-route-guard";
import { TRPCReactProvider } from "~/trpc/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TRPCReactProvider>{children}</TRPCReactProvider>
      <ThemeToggleRouteGuard />
      <Toaster />
    </ThemeProvider>
  );
}
