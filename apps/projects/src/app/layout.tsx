import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { GeistMono } from "geist/font/mono";

import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://projects.knighthacks.org"),
  title: {
    default: "Projects | Knight Hacks",
    template: "%s | Projects by Knight Hacks",
  },
  description:
    "An independent archive of the ideas, systems, and technical decisions behind community-built projects.",
  applicationName: "Knight Hacks Projects",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Knight Hacks Projects",
    title: "Projects | Knight Hacks",
    description:
      "A closer look at how community-built projects are designed and made.",
  },
  twitter: {
    card: "summary",
    title: "Projects | Knight Hacks",
    description:
      "A closer look at how community-built projects are designed and made.",
  },
  icons: {
    icon: "/sigilKH.svg",
    shortcut: "/sigilKH.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090a10",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body className={`${montserrat.variable} ${GeistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
