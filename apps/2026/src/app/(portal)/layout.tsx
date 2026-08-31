import type { Metadata } from "next";
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

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PortalAuthBoundary>{children}</PortalAuthBoundary>
      <PortalSessionControl />
    </>
  );
}
