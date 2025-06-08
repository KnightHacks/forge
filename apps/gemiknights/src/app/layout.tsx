import type { Metadata } from "next";
import BgSVG from "./_components/graphics/background";
import "./globals.css";
import Navbar from "./_components/navbar/Navbar";

export const metadata: Metadata = {
  metadataBase: new URL("https://club.knighthacks.org"),
  title: "GemiKnights",
  description: "Geminite",
  openGraph: {
    title: "GemiKnights",
    description:
      "this is the geminite yayayayaya",
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
    <html lang="en">
      <body
        className= "antialiased"
      >
        <div className="absolute inset-0 -z-10">
        <BgSVG />
        </div>
        <span className="tk-peridot-devanagari"><Navbar /></span>
        {children}
      </body>
    </html>
  );
}
