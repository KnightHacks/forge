import type { Metadata } from "next";

import Footer from "./_components/footer/footer";
import BgSVG from "./_components/graphics/background";
import Squiggles from "./_components/graphics/squiggles";
import Navbar from "./_components/navbar/Navbar";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gemiknights.knighthacks.org"),
  title: "GemiKnights",
  description:
    "GemiKnights is a 12-hour mini-Hackathon held by Knight Hacks at the University of Central Florida. Join us on June 28th for a day of building, learning, and innovation with AI!",
  openGraph: {
    title: "GemiKnights",
    description:
      "GemiKnights is a 12-hour mini-Hackathon held by Knight Hacks at the University of Central Florida. Join us on June 28th for a day of building, learning, and innovation with AI!",
    url: "https://gemiknights.knighthacks.org",
    siteName: "GemiKnights",
    images: [
      {
        url: "https://gemiknights.knighthacks.org/event-banner.png",
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
        <span className="tk-peridot-devanagari">
          <Navbar />
        </span>
        <main className="flex-1">{children}</main>
        <Squiggles />
        <div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
