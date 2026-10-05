import type { ReactNode } from "react";

import { KhixDashboardShell } from "../_components/khix-dashboard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <KhixDashboardShell>{children}</KhixDashboardShell>;
}
