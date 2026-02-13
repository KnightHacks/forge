import type { Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://guild.knighthacks.org"),
  title: "The Guild | Knight Hacks",
  description:
    "View the Guild Collective of Knight Hacks, a community of technologists at the University of Central Florida.",
  openGraph: {
    title: "Knight Hacks",
    description:
      "View the Guild Collective of Knight Hacks, a community of technologists at the University of Central Florida.",
    url: "https://guild.knighthacks.org",
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
      <body className={`antialiased`}>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
