import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { cn } from "@forge/ui";

import { Providers } from "~/app/_components/providers";
import { env } from "~/env";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_BLADE_URL),
  title: "Blade",
  description: "The Knight Hacks member platform.",
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
          GeistSans.variable,
          GeistMono.variable,
        )}
      >
        <Providers>{props.children}</Providers>
      </body>
    </html>
  );
}
