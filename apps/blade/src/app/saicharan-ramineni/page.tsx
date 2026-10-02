import type { Metadata } from "next";

import { SaicharanPortfolioGate } from "~/app/_components/applications/saicharan-portfolio-gate";

export const metadata: Metadata = {
  title: "Saicharan Ramineni | Dev Application",
  description: "Saicharan Ramineni's Knight Hacks Dev application for 2026–27.",
};

export default function SaicharanRamineniPage() {
  return <SaicharanPortfolioGate />;
}
