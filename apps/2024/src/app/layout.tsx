import type { Metadata, Viewport } from "next";

import "./styles.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://2024.knighthacks.org"),
  title: "Knight Hacks 2024",
  description: "The public archive of Knight Hacks 2024.",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#0d3047",
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
