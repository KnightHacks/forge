import type { Metadata } from "next";
import localFont from "next/font/local";

// import Navbar from "./_components/navigation/navbar";

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
  title: "Knight Hacks",
  description: "UCF's largest hackathon and software engineering organization",
  openGraph: {
    title: "Knight Hacks",
    description:
      "UCF's largest hackathon and software engineering organization",
    url: "https://club.knighthacks.org",
    siteName: "Knight Hacks",
    images: [
      {
        url: "https://blade.knighthacks.org/banner.png",
        alt: "Knight Hacks Banner",
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* <Navbar /> */}
        {children}
      </body>
    </html>
  );
}
