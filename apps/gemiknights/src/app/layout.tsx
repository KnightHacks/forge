import type { Metadata } from "next";
import localFont from "next/font/local";
import BgSVG from "./_components/graphics/background";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="absolute inset-0 -z-10">
        <BgSVG />
        {children}
      </div>
      </body>
    </html>
  );
}
