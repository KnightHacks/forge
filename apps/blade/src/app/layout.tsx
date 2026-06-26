import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Blade Reforge",
  description: "Reforge scaffold for the Knight Hacks platform.",
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{props.children}</body>
    </html>
  );
}
