import type { Metadata } from "next";

import Footer from "./_components/footer/footer";
import AnimatedBirds from "./_components/graphics/AnimatedBirds";
import FloatingFlowers from "./_components/graphics/FloatingFlowers";
import FlowerCursor from "./_components/graphics/Flowercursor";
import ParallaxBackground from "./_components/graphics/ParallaxBackground";
import Squiggles from "./_components/graphics/squiggles";
import Navbar from "./_components/navbar/Navbar";
import {
  eventJsonLd,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_ALT,
  OG_IMAGE_URL,
  OG_IMAGE_WIDTH,
  SEO_DESCRIPTION,
  SEO_KEYWORDS,
  SEO_TITLE,
  SITE_URL,
} from "./seo";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  applicationName: "BloomKnights",
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
    icon: "/BloomKnightsSigil.svg",
    shortcut: "/BloomKnightsSigil.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    url: SITE_URL,
    siteName: "BloomKnights",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="bloom-site-background flex min-h-screen flex-col antialiased">
        <ParallaxBackground />
        <AnimatedBirds />
        <FloatingFlowers />
        <FlowerCursor />

        <span className="font-dm-sans">
          <Navbar />
        </span>

        <main className="flex-1 pt-8">{children}</main>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(eventJsonLd).replace(/</g, "\\u003c"),
          }}
        />

        <Squiggles />
        <footer className="mt-auto">
          <Footer />
        </footer>
      </body>
    </html>
  );
}
