import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";

import "~/styles/legacy.css";
import "~/styles/archive.css";

const lato = Lato({
  subsets: ["latin"],
  variable: "--font-lato",
  // The original archive requested only Lato Black. Keeping that single face
  // preserves the unusually heavy typography used throughout the 2020 site.
  weight: "900",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://2020.knighthacks.org"),
  title: "Knight Hacks 2020",
  description:
    "The public archive of Knight Hacks 2020, held October 9-11, 2020.",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#3e548a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={lato.variable}>
      <body>{children}</body>
    </html>
  );
}
