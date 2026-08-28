import type { Metadata, Viewport } from "next";

import "~/styles/archive.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://2023.knighthacks.org"),
  title: "Knight Hacks 2023",
  description:
    "The public archive of Knight Hacks 2023, held October 6-8, 2023.",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#37388f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
