import type { Metadata } from "next";
import type { ReactNode } from "react";

import "~/styles/legacy.css";
import "~/styles/archive.css";

export const metadata: Metadata = {
  title: {
    default: "Knight Hacks 2021",
    template: "%s | Knight Hacks 2021",
  },
  description:
    "The public archive of Knight Hacks 2021, held virtually November 12 through November 14, 2021.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
