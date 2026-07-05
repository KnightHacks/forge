import type { ReactNode } from "react";

import { BloomKnightsDashboardShell } from "../_components/bloomknights-dashboard-shell";
import { PortalHeader } from "../_components/portal-header";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <BloomKnightsDashboardShell fixedBackground>
      <PortalHeader />
      {children}
    </BloomKnightsDashboardShell>
  );
}
