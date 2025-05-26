import type { Metadata } from "next";

import "./globals.css";

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
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
