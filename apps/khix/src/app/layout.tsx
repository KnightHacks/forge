import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Faculty_Glyphic } from "next/font/google";

const font = Faculty_Glyphic({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-khix",
});

import WispCursor from "./_components/WispCursor";
import {
  eventJsonLd,
  OG_IMAGE_ALT,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_URL,
  OG_IMAGE_WIDTH,
  SEO_DESCRIPTION,
  SEO_KEYWORDS,
  SEO_TITLE,
  SITE_URL,
} from "./seo";

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
    icon: [{ url: "/khix-sigil.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/khix-sigil.svg", type: "image/svg+xml" }],
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
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
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
  themeColor: "#070c10",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${font.className} ${font.variable} antialiased`}
      >
        {children}
        <WispCursor />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(eventJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
