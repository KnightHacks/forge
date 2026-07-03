"use client";

import { ThemeProvider, ThemeToggle } from "@forge/ui/theme";
import { Toaster } from "@forge/ui/toast";

import { TRPCReactProvider } from "~/trpc/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TRPCReactProvider>{children}</TRPCReactProvider>
      <div className="fixed bottom-4 right-4">
        <ThemeToggle />
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
