import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PortalAuthBoundary, PortalSessionControl } from "~/lib/hacker-portal";
import { PortalLoadingScreen } from "./_components/portal-loading-screen";

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
      <PortalAuthBoundary loadingFallback={<PortalLoadingScreen />}>
        <PortalLoadingScreen revealing />
        {children}
      </PortalAuthBoundary>
      <PortalSessionControl />
    </>
  );
}
