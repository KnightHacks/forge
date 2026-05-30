import type { Metadata } from "next";

import Footer from "./_components/footer/footer";
import BgSVG from "./_components/graphics/background";
import FloatingFlowers from "./_components/graphics/FloatingFlowers";
import FlowerCursor from "./_components/graphics/Flowercursor";
import Squiggles from "./_components/graphics/squiggles";
import Navbar from "./_components/navbar/Navbar";
// TypeScript may complain about side-effect CSS imports if no declaration file is present.
// Suppress the error for this valid Next.js global CSS import.
// @ts-ignore
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bloom.knighthacks.org"),
  title: "BloomKnights",
  description:
    "BloomKnights is a 12-hour mini-Hackathon held by Knight Hacks at the University of Central Florida. Join us on July 11th for a day of building, learning, and innovation!",
  openGraph: {
    title: "BloomKnights",
    description:
      "BloomKnights is a 12-hour mini-Hackathon held by Knight Hacks at the University of Central Florida. Join us on July 11th for a day of building, learning, and innovation!",
    url: "https://bloom.knighthacks.org",
    siteName: "BloomKnights",
    images: [
      {
        url: "https://bloom.knighthacks.org/event-banner.png",
        alt: "Event Banner",
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
      <body className="flex min-h-screen flex-col antialiased">
        <div className="fixed inset-0 -z-10">
          <div className="h-full w-full" style={{ minHeight: "100vh" }}>
            <BgSVG
              className="h-full w-full"
              preserveAspectRatio="xMidYMid slice"
            />
          </div>
        </div>

        <FloatingFlowers />
        <FlowerCursor />

        <span className="font-dm-sans">
          <Navbar />
        </span>

        <main className="flex-1 pt-8">{children}</main>

        <Squiggles />
        <div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
