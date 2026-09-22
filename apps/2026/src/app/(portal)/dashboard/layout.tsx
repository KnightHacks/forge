import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Dashboard | Knight Hacks IX",
    template: "%s | Knight Hacks IX",
  },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
