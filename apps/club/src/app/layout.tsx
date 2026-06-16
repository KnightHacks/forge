import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";

import { env } from "~/env";
import ClubMotionRuntime from "./_components/club-motion-runtime";
import Footer from "./_components/footer";
import JsonLd from "./_components/json-ld";
import Navbar from "./_components/navbar";
import {
  OG_IMAGE_ALT,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_URL,
  OG_IMAGE_WIDTH,
  SEO_DESCRIPTION,
  SEO_KEYWORDS,
  SEO_TITLE,
  SITE_NAME,
  SITE_URL,
  siteJsonLd,
} from "./seo";

import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const bladeUrl = env.BLADE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SEO_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SEO_DESCRIPTION,
  applicationName: SITE_NAME,
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
    icon: [{ url: "/sigilKH.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/sigilKH.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
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
  width: "device-width",
  initialScale: 1,
  themeColor: "#140316",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} antialiased`}>
        <ClubMotionRuntime />
        <div className="club-home-bg flex min-h-screen flex-col overflow-hidden">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-black focus:text-[#140316] focus:outline-none focus:ring-2 focus:ring-[var(--club-gold)]"
          >
            Skip to main content
          </a>
          <Navbar bladeUrl={bladeUrl} />
          <div
            id="main-content"
            tabIndex={-1}
            className="flex-1 focus:outline-none"
          >
            {children}
          </div>
          <Footer bladeUrl={bladeUrl} />
        </div>
        <JsonLd data={siteJsonLd} />
      </body>
    </html>
  );
}
