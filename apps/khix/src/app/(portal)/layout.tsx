import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Toaster } from "@forge/ui/toast";

import {
  HackathonPortalProvider,
  PortalAuthBoundary,
} from "~/lib/hacker-portal";
import { KHIX_PORTAL_CONFIG } from "~/lib/portal-config";

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
    <HackathonPortalProvider config={KHIX_PORTAL_CONFIG} portalKey="khix">
      <PortalAuthBoundary>{children}</PortalAuthBoundary>
      <Toaster />
    </HackathonPortalProvider>
  );
}
