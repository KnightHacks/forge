import type { ReactNode } from "react";

import { HackathonPortalProvider } from "@forge/hackathon/client";
import { Toaster } from "@forge/ui/toast";

import { BLOOM_PORTAL_CONFIG } from "~/lib/portal-config";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <HackathonPortalProvider config={BLOOM_PORTAL_CONFIG}>
      {children}
      <Toaster />
    </HackathonPortalProvider>
  );
}
