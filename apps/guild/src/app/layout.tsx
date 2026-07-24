import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { cn } from "@forge/ui";

import { TRPCReactProvider } from "~/trpc/react";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://guild.knighthacks.org"),
  title: {
    default: "Guild Collective | Knight Hacks",
    template: "%s | Guild Collective",
  },
  description:
    "View the Guild Collective of Knight Hacks, a community of technologists at the University of Central Florida.",
  openGraph: {
    title: "Guild Collective | Knight Hacks",
    description:
      "View the Guild Collective of Knight Hacks, a community of technologists at the University of Central Florida.",
    url: "https://guild.knighthacks.org",
    siteName: "Knight Hacks",
    images: [
      {
        url: "https://blade.knighthacks.org/banner.png",
        alt: "Knight Hacks Banner",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#030712",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
          GeistSans.variable,
          GeistMono.variable,
        )}
      >
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
