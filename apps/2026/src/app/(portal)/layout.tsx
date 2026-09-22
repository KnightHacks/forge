import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { PortalAuthBoundary, PortalSessionControl } from "~/lib/hacker-portal";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  initialScale: 1,
  themeColor: "#190925",
  viewportFit: "cover",
  width: "device-width",
};

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PortalAuthBoundary>{children}</PortalAuthBoundary>
      <PortalSessionControl />
    </>
  );
}
