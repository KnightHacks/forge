import type { Metadata } from "next";
import type { ReactNode } from "react";

import { HackathonPortalProvider } from "@forge/hackathon/client";
import { Toaster } from "@forge/ui/toast";

import { getKhixHackathon } from "~/lib/khix-hackathon";
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

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const khix = await getKhixHackathon();

  return (
    <HackathonPortalProvider
      config={{
        ...KHIX_PORTAL_CONFIG,
        hackathonName: khix?.name ?? KHIX_PORTAL_CONFIG.hackathonName,
      }}
    >
      {children}
      <Toaster />
    </HackathonPortalProvider>
  );
}
