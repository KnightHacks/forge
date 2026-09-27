"use client";

import { ThemeProvider } from "@forge/ui/theme";
import { Toaster } from "@forge/ui/toast";

import { NavigationProvider } from "~/app/_components/shared/route-transition-link";
import { TRPCReactProvider } from "~/trpc/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <NavigationProvider>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </NavigationProvider>
      <Toaster />
    </ThemeProvider>
  );
}
