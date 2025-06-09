import type { Metadata } from "next";

import Footer from "./_components/footer/footer";
import BgSVG from "./_components/graphics/background";
import Squiggles from "./_components/graphics/squiggles";
import Navbar from "./_components/navbar/Navbar";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://club.knighthacks.org"),
  title: "GemiKnights",
  description: "Geminite",
  openGraph: {
    title: "GemiKnights",
    description: "this is the geminite yayayayaya",
    url: "https://club.knighthacks.org",
    siteName: "GemiKnights",
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
