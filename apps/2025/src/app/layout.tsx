import type { Metadata } from "next";
import "~/styles/globals.css";
import Footer from "./_components/footer/footer";
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
  themeColor: "#d83434",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className="bg-[url('/background.svg')] bg-cover bg-center bg-no-repeat"
        style={{
          transform: "translate3d(0,0,0)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          WebkitTransform: "translate3d(0,0,0)",
          overflowX: "hidden",
          minHeight: "100vh",
        }}
      >
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
