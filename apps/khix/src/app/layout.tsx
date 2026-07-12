import "./globals.css";

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { SiteAudio } from "./_components/audio";
import { SEO_DESCRIPTION, SEO_TITLE, SITE_URL } from "./seo";

const bagnard = localFont({
  src: "./fonts/Bagnard.otf",
  weight: "400",
  style: "normal",
  variable: "--font-bagnard",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  applicationName: "Knight Hacks IX",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      {
        url: "https://assets.knighthacks.org/khix/favicon.png",
        type: "image/png",
      },
    ],
    shortcut: [
      {
        url: "https://assets.knighthacks.org/khix/favicon.png",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    url: "/",
    siteName: "Knight Hacks IX",
    type: "website",
    images: [
      {
        url: "https://assets.knighthacks.org/khix/og-image.webp",
        width: 1920,
        height: 1080,
        alt: "Knight Hacks IX at the University of Central Florida",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    images: ["https://assets.knighthacks.org/khix/og-image.webp"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#eef6cf",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bagnard.variable} dark h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        {children}
        <SiteAudio />
      </body>
    </html>
  );
}
