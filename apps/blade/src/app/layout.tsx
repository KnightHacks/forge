import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { cn } from "@forge/ui";
import { ThemeProvider, ThemeToggle } from "@forge/ui/theme";
import { Toaster } from "@forge/ui/toast";

import { TRPCReactProvider } from "~/trpc/react";

import "./globals.css";

import { env } from "~/env";
import { NextAuthProvider } from "./_components/next-auth-provider";

export const metadata: Metadata = {
  metadataBase: new URL(
    env.NODE_ENV === "production"
      ? "https://blade.knighthacks.org"
      : "http://localhost:3000",
  ),
  title: "Blade",
  description: "The centralized platform for all things Knight Hacks",
  openGraph: {
    title: "Blade",
    description: "The centralized platform for all things Knight Hacks",
    url: "https://blade.knighthacks.org",
    siteName: "Blade",
    images: [{ url: "https://blade.knighthacks.org/banner.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
          GeistSans.variable,
          GeistMono.variable,
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <TRPCReactProvider>
            <NextAuthProvider>{props.children}</NextAuthProvider>
          </TRPCReactProvider>
          <div className="fixed bottom-4 right-4">
            <ThemeToggle />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
