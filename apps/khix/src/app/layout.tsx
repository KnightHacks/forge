import "./globals.css";

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import {
  OG_IMAGE_ALT,
  OG_IMAGE_URL,
  SEO_DESCRIPTION,
  SEO_KEYWORDS,
  SEO_TITLE,
  SITE_URL,
} from "./seo";

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
  keywords: SEO_KEYWORDS,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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
    apple: [
      {
        url: "https://assets.knighthacks.org/khix/favicon.png",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    url: SITE_URL,
    siteName: "Knight Hacks IX",
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1920,
        height: 1080,
        alt: OG_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE_URL,
        alt: OG_IMAGE_ALT,
      },
    ],
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
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
