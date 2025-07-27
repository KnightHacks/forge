import type { Metadata, Viewport } from "next";
import "~/styles/globals.css";
import Navbar from "./_components/navbar/Navbar";

export const metadata: Metadata = {
  metadataBase: new URL("https://2025.knighthacks.org"),
  title: "Knight Hacks VIII",
  description:
    "Knight Hacks VIII is a 36-hour Hackathon held at the University of Central Florida. Join us on October 24th - 26th for a weekend of building, learning, and innovation!",
  keywords: [
    "Hackathon",
    "UCF",
    "Knight Hacks",
    "Knight Hacks VIII",
    "Computer Science",
    "Software Engineering",
    "Orlando FL",
  ],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Knight Hacks VIII",
    type: "website",
    description:
      "Knight Hacks VIII is a 36-hour Hackathon held at the University of Central Florida. Join us on October 24th - 26th for a weekend of building, learning, and innovation!",
    url: "https://2025.knighthacks.org",
    siteName: "Knight Hacks VIII",
    images: [
      {
        url: "https://2025.knighthacks.org/event-banner.png",
        alt: "Event Banner",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#c84c3c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" style={{ background: "#000000" }}>
      <head>
        <link rel="preload" as="image" href="/background.svg" />
        <link rel="preload" as="image" href="/about-graphic.svg" />
        <link rel="preload" as="image" href="/comic.svg" />
        <link rel="dns-prefetch" href="//mlh.io" />
        <link rel="dns-prefetch" href="//discord.knighthacks.org" />
        <script dangerouslySetInnerHTML={{ __html: `
          // Reset scroll position on page load
          window.addEventListener('load', function() {
            window.scrollTo(0, 0);
            history.scrollRestoration = 'manual';
          });
        ` }} />
      </head>
      <body style={{ overflowX: "hidden", minHeight: "100vh", background: "#000000" }}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
